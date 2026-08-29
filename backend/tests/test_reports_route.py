import json
import os
import uuid
import zipfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.database import Base, Case, PhaseResult
from app.api.routes.reports import _load_case_data, _fallback_narrative, EvidencePackager
from app.services.audit_service import log_action


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def _make_case(db_session, **overrides):
    case = Case(
        id=uuid.uuid4(),
        case_number="CASE-TEST0001",
        apk_hash="a" * 64,
        apk_name="evil.apk",
        status="completed",
        **overrides,
    )
    db_session.add(case)
    db_session.commit()
    db_session.refresh(case)
    return case


def test_load_case_data_includes_pentest_and_pcap_evidence(db_session):
    """Regression test: pentest_data (child APKs + PCAP stats) must reach the
    data the PDF report and fallback narrative are built from."""
    case = _make_case(db_session)

    dynamic_result = {
        "mode": "manual_pentest",
        "risk_score": 88,
        "behaviors": {"c2_communication": True, "dropper": True, "surveillance": False},
        "network_activity": [{"destination": "c2.evil.example", "ip": "1.2.3.4"}],
        "pentest_data": {
            "child_apk_count": 1,
            "hidden_child_apks": [{"package_name": "com.evil.dropper", "is_hidden": True}],
            "running_child_apks": [{"package_name": "com.evil.dropper", "is_running": True}],
            "pcapdroid_used": True,
            "network_stats": {
                "status": "success",
                "total_packets": 120,
                "total_bytes": 500000,
                "direction_summary": {"inbound_bytes": 100000, "outbound_bytes": 400000},
                "suspicious_indicators": [
                    {"type": "periodic_beaconing", "severity": "critical", "description": "Beaconing to 1.2.3.4 every ~9.8s"},
                ],
            },
        },
    }
    db_session.add(PhaseResult(case_id=case.id, phase="dynamic", result=dynamic_result, risk_score=88))
    db_session.commit()

    data = _load_case_data(str(case.id), db_session)

    assert data["dynamic_analysis"]["mode"] == "manual_pentest"
    assert "c2_communication" in data["dynamic_analysis"]["behavioral_flags"]
    assert "c2.evil.example" in data["dynamic_analysis"]["contacted_hosts"]

    pentest = data["pentest_analysis"]
    assert pentest["child_apk_count"] == 1
    assert "com.evil.dropper" in pentest["hidden_child_apks"]
    assert pentest["network_traffic"]["total_packets"] == 120
    assert pentest["network_traffic"]["total_bytes"] == 500000
    assert pentest["network_traffic"]["inbound_bytes"] == 100000
    assert pentest["network_traffic"]["outbound_bytes"] == 400000
    assert "Beaconing to 1.2.3.4 every ~9.8s" in pentest["network_traffic"]["suspicious_indicators"]

    # The fallback (non-LLM) narrative must surface this evidence too.
    narrative = _fallback_narrative(data)
    assert "com.evil.dropper" in narrative
    assert "120 packets" in narrative
    assert "Beaconing to 1.2.3.4" in narrative


def test_load_case_data_handles_emulator_mode_without_pentest_section(db_session):
    case = _make_case(db_session)
    dynamic_result = {
        "mode": "emulator",
        "risk_score": 15,
        "behaviors": {},
        "network_activity": [],
    }
    db_session.add(PhaseResult(case_id=case.id, phase="dynamic", result=dynamic_result, risk_score=15))
    db_session.commit()

    data = _load_case_data(str(case.id), db_session)

    assert data["dynamic_analysis"]["mode"] == "emulator"
    assert "pentest_analysis" not in data

    narrative = _fallback_narrative(data)
    assert "MANUAL PENETRATION TEST" not in narrative


def test_load_case_data_unknown_case_returns_empty(db_session):
    assert _load_case_data(str(uuid.uuid4()), db_session) == {}


# ── Evidence Packager Tests ────────────────────────────────────────

def test_evidence_package_includes_real_artifacts_and_chain_of_custody(db_session, tmp_path):
    case = _make_case(db_session)
    case_id = str(case.id)

    cases_dir = tmp_path / "cases"
    case_dir = cases_dir / case_id
    case_dir.mkdir(parents=True)

    # Real artifacts on disk, matching what the upload/analysis pipeline produces.
    (case_dir / "evil.apk").write_bytes(b"PK\x03\x04fake-apk-bytes")

    static_dir = case_dir / "static_analysis"
    static_dir.mkdir()
    (static_dir / "static_report.json").write_text(json.dumps({"risk_score": 90}))

    (case_dir / "sha256_manifest.json").write_text(json.dumps({"evil.apk": {"sha256": "a" * 64}}))

    pentest_dir = case_dir / "pentest_analysis"
    pentest_dir.mkdir()
    (pentest_dir / "network_capture.pcap").write_bytes(b"\xd4\xc3\xb2\xa1fake-pcap")
    (pentest_dir / "child_com.evil.dropper.apk").write_bytes(b"PK\x03\x04fake-child-apk")

    # A real audit trail for the chain of custody.
    log_action(db_session, action="APK_UPLOADED", case_id=case.id, details={"filename": "evil.apk"})
    log_action(db_session, action="PENTEST_SESSION_STOPPED", case_id=case.id, details={"child_apks": 1})

    packager = EvidencePackager(str(cases_dir), str(tmp_path / "keys"))
    zip_path = packager.package_case(case_id, case.case_number, db=db_session)

    assert os.path.exists(zip_path)
    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()
        assert "artifacts/evil.apk" in names
        assert "reports/static_report.json" in names
        assert "reports/sha256_manifest.json" in names
        assert "pentest_artifacts/network_capture.pcap" in names
        assert "pentest_artifacts/child_com.evil.dropper.apk" in names
        assert "chain_of_custody.json" in names
        assert "manifest.json" in names
        assert "section_65B_certificate.txt" in names

        coc = json.loads(zf.read("chain_of_custody.json"))
        actions = [e["action"] for e in coc["chain_of_custody"]]
        assert "APK_UPLOADED" in actions
        assert "PENTEST_SESSION_STOPPED" in actions

        manifest = json.loads(zf.read("manifest.json"))
        assert manifest["chain_of_custody_entries"] == 2
        assert "artifacts/evil.apk" in manifest["included_files"]


def test_evidence_package_without_db_still_produces_valid_zip(tmp_path):
    """No audit trail available -- must degrade gracefully, not crash."""
    cases_dir = tmp_path / "cases"
    case_dir = cases_dir / "case-no-db"
    case_dir.mkdir(parents=True)
    (case_dir / "sample.apk").write_bytes(b"PK\x03\x04")

    packager = EvidencePackager(str(cases_dir), str(tmp_path / "keys"))
    zip_path = packager.package_case("case-no-db", "CASE-NODB0001", db=None)

    assert os.path.exists(zip_path)
    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()
        assert "artifacts/sample.apk" in names
        assert "chain_of_custody.json" not in names
        manifest = json.loads(zf.read("manifest.json"))
        assert manifest["chain_of_custody_entries"] == 0

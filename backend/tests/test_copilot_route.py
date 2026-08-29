import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.database import Base, Case, PhaseResult
from app.api.routes.copilot import _load_case_context


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
        case_number="CASE-TEST0002",
        apk_hash="b" * 64,
        apk_name="evil.apk",
        status="completed",
        **overrides,
    )
    db_session.add(case)
    db_session.commit()
    db_session.refresh(case)
    return case


def test_copilot_context_includes_pentest_and_pcap_evidence(db_session):
    """Co-Pilot must be able to answer questions about child APKs and network
    traffic captured during a manual pentest session -- regression test for
    the schema mismatch that silently produced empty dynamic_analysis."""
    case = _make_case(db_session)

    dynamic_result = {
        "mode": "manual_pentest",
        "risk_score": 91,
        "behaviors": {"c2_communication": True, "dropper": True},
        "network_activity": [{"destination": "c2.evil.example"}],
        "pentest_data": {
            "child_apks": [
                {"package_name": "com.evil.dropper", "is_hidden": True, "is_running": True, "risk_level": "CRITICAL"},
            ],
            "network_stats": {
                "status": "success",
                "total_packets": 55,
                "total_bytes": 200000,
                "direction_summary": {"inbound_bytes": 20000, "outbound_bytes": 180000},
                "suspicious_indicators": [
                    {"type": "exfiltration_pattern", "severity": "high", "description": "180KB sent outbound with little response"},
                ],
            },
        },
    }
    db_session.add(PhaseResult(case_id=case.id, phase="dynamic", result=dynamic_result, risk_score=91))
    db_session.commit()

    context = _load_case_context(str(case.id), db_session)

    dyn = context["dynamic_analysis"]
    assert dyn["mode"] == "manual_pentest"
    assert "c2_communication" in dyn["behavioral_flags"]
    assert "c2.evil.example" in dyn["contacted_hosts"]
    assert dyn["parent_child_payloads"][0]["package_name"] == "com.evil.dropper"
    assert dyn["pcap_traffic"]["total_bytes"] == 200000
    assert "180KB sent outbound with little response" in dyn["pcap_traffic"]["suspicious_indicators"]


def test_copilot_context_unknown_case_returns_error(db_session):
    context = _load_case_context(str(uuid.uuid4()), db_session)
    assert "error" in context


def test_copilot_context_invalid_uuid_returns_error(db_session):
    context = _load_case_context("not-a-uuid", db_session)
    assert context == {"error": "Invalid case ID"}

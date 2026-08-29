from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api.dependencies import get_db
from app.models.database import Case
from app.models.schemas import Case as CaseSchema

router = APIRouter()

@router.get("/", response_model=List[CaseSchema])
def get_cases(db: Session = Depends(get_db)):
    """
    Retrieve all cases.
    """
    cases = db.query(Case).all()
    return cases

@router.get("/{case_id}", response_model=CaseSchema)
def get_case(case_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve details for a specific case by ID.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return case

@router.post("/{case_id}/dynamic/run")
def run_dynamic_analysis_on_demand(case_id: UUID, db: Session = Depends(get_db)):
    """
    On-demand trigger to boot the emulator and run dynamic analysis.
    """
    import os
    import threading
    import logging
    from app.models.database import PhaseResult
    
    logger = logging.getLogger(__name__)
    
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
        
    def _run_emulator_bg(cid: str, apk_name: str):
        from app.models.session import SessionLocal
        from app.engines.dynamic import run_full_dynamic_analysis
        from datetime import datetime
        import uuid as _uuid
        
        db_bg = SessionLocal()
        try:
            case_uuid = _uuid.UUID(cid)
            DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "cases")
            case_dir = os.path.join(DATA_DIR, cid)
            apk_path = os.path.join(case_dir, apk_name)
            
            logger.info(f"Starting ON DEMAND dynamic analysis for case {cid}")
            # Emulator should already be running (user launched via batch file)
            # Install APK, open it, collect data for 90s while user browses
            dynamic_result = run_full_dynamic_analysis(apk_path, case_dir, duration=90, force_emulator=False)
            
            def _parse_dt(val):
                if val is None:
                    return datetime.utcnow()
                if isinstance(val, str):
                    try:
                        return datetime.fromisoformat(val.replace("Z", "+00:00"))
                    except:
                        return datetime.utcnow()
                return val
            
            # Delete old dynamic phase if exists
            old_phase = db_bg.query(PhaseResult).filter(PhaseResult.case_id == case_uuid, PhaseResult.phase == "dynamic").first()
            if old_phase:
                db_bg.delete(old_phase)
                
            dynamic_phase = PhaseResult(
                case_id=case_uuid,
                phase="dynamic",
                result=dynamic_result,
                risk_score=dynamic_result.get("risk_score", 0),
                completed_at=_parse_dt(dynamic_result.get("completed_at"))
            )
            db_bg.add(dynamic_phase)
            db_bg.commit()
            
            # Re-run C2 Intelligence with new dynamic network data
            from app.engines.c2 import run_full_c2_intelligence
            logger.info("Updating C2 Intelligence with dynamic findings...")
            c2_result = run_full_c2_intelligence(apk_path, case_dir, cid)
            old_c2 = db_bg.query(PhaseResult).filter(PhaseResult.case_id == case_uuid, PhaseResult.phase == "c2_intelligence").first()
            if old_c2: db_bg.delete(old_c2)
            db_bg.add(PhaseResult(case_id=case_uuid, phase="c2_intelligence", result=c2_result, risk_score=c2_result.get("risk_score", 0), completed_at=_parse_dt(c2_result.get("completed_at"))))
            db_bg.commit()
            
            # Re-run Vulnerability scan with all 3 reports (static, dynamic, c2)
            from app.engines.vulnerability import run_vulnerability_scan
            logger.info("Updating Vulnerabilities with full intelligence...")
            vuln_result = run_vulnerability_scan(case_dir, cid)
            old_vuln = db_bg.query(PhaseResult).filter(PhaseResult.case_id == case_uuid, PhaseResult.phase == "vulnerability").first()
            if old_vuln: db_bg.delete(old_vuln)
            db_bg.add(PhaseResult(case_id=case_uuid, phase="vulnerability", result=vuln_result, risk_score=vuln_result.get("risk_score", 0), completed_at=_parse_dt(vuln_result.get("completed_at"))))
            db_bg.commit()
            
            logger.info("On-demand dynamic analysis and intelligence correlation complete!")
        except Exception as e:
            logger.error(f"On-demand dynamic analysis failed: {e}")
        finally:
            db_bg.close()

    thread = threading.Thread(
        target=_run_emulator_bg,
        args=(str(case.id), case.apk_name),
        daemon=True
    )
    thread.start()
    
    return {"status": "started", "message": "Emulator analysis triggered"}


# ── Manual Penetration Testing Endpoints ────────────────────────────

@router.get("/{case_id}/pentest/devices")
def scan_pentest_devices(case_id: UUID, db: Session = Depends(get_db)):
    """
    Scan for physical Android devices connected via USB.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    from app.engines.dynamic.device_monitor import scan_usb_devices
    devices = scan_usb_devices()

    return {"devices": devices, "count": len(devices)}


@router.post("/{case_id}/pentest/start")
def start_pentest_session(
    case_id: UUID,
    body: dict = None,
    db: Session = Depends(get_db)
):
    """
    Start a manual penetration testing monitoring session on a physical device.
    Body: { "device_serial": "XYZ123" }
    """
    import os

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not body or not body.get("device_serial"):
        raise HTTPException(status_code=400, detail="device_serial is required")

    device_serial = body["device_serial"]

    DATA_DIR = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data", "cases"
    )
    case_dir = os.path.join(DATA_DIR, str(case_id))
    apk_path = os.path.join(case_dir, case.apk_name)

    from app.engines.dynamic.device_monitor import start_monitoring_session
    result = start_monitoring_session(
        device_serial=device_serial,
        case_dir=case_dir,
        case_id=str(case_id),
        apk_path=apk_path,
    )

    return result


@router.get("/{case_id}/pentest/status")
def get_pentest_status(case_id: UUID, db: Session = Depends(get_db)):
    """
    Get live status of the active monitoring session for a case.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    from app.engines.dynamic.device_monitor import (
        get_active_session_for_case,
        get_session_status,
    )
    session_id = get_active_session_for_case(str(case_id))
    if not session_id:
        return {"status": "no_active_session"}

    return get_session_status(session_id)


@router.post("/{case_id}/pentest/stop")
def stop_pentest_session(case_id: UUID, db: Session = Depends(get_db)):
    """
    Stop the monitoring session, generate report, save to DB,
    and trigger C2 + Vulnerability re-analysis with the new data.
    """
    import os
    import threading
    import logging
    from datetime import datetime

    logger = logging.getLogger(__name__)

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    from app.engines.dynamic.device_monitor import (
        get_active_session_for_case,
        stop_monitoring_session,
    )
    session_id = get_active_session_for_case(str(case_id))
    if not session_id:
        raise HTTPException(status_code=400, detail="No active monitoring session")

    def _finalize_bg(cid: str, sid: str, apk_name: str):
        from app.models.session import SessionLocal
        import uuid as _uuid

        db_bg = SessionLocal()
        try:
            case_uuid = _uuid.UUID(cid)

            # Stop monitoring and get result
            dynamic_result = stop_monitoring_session(sid)

            def _parse_dt(val):
                if val is None:
                    return datetime.utcnow()
                if isinstance(val, str):
                    try:
                        return datetime.fromisoformat(val.replace("Z", "+00:00"))
                    except Exception:
                        return datetime.utcnow()
                return val

            # Delete old dynamic phase if exists
            old_phase = db_bg.query(PhaseResult).filter(
                PhaseResult.case_id == case_uuid,
                PhaseResult.phase == "dynamic"
            ).first()
            if old_phase:
                db_bg.delete(old_phase)

            dynamic_phase = PhaseResult(
                case_id=case_uuid,
                phase="dynamic",
                result=dynamic_result,
                risk_score=dynamic_result.get("risk_score", 0),
                completed_at=_parse_dt(dynamic_result.get("completed_at"))
            )
            db_bg.add(dynamic_phase)
            db_bg.commit()

            # Re-run C2 Intelligence with new network data
            DATA_DIR = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "data", "cases"
            )
            case_dir = os.path.join(DATA_DIR, cid)
            apk_path = os.path.join(case_dir, apk_name)

            from app.engines.c2 import run_full_c2_intelligence
            logger.info("Updating C2 Intelligence with pentest findings...")
            c2_result = run_full_c2_intelligence(apk_path, case_dir, cid)
            old_c2 = db_bg.query(PhaseResult).filter(
                PhaseResult.case_id == case_uuid,
                PhaseResult.phase == "c2_intelligence"
            ).first()
            if old_c2:
                db_bg.delete(old_c2)
            db_bg.add(PhaseResult(
                case_id=case_uuid, phase="c2_intelligence",
                result=c2_result, risk_score=c2_result.get("risk_score", 0),
                completed_at=_parse_dt(c2_result.get("completed_at"))
            ))
            db_bg.commit()

            # Re-run Vulnerability scan
            from app.engines.vulnerability import run_vulnerability_scan
            logger.info("Updating Vulnerabilities with pentest intelligence...")
            vuln_result = run_vulnerability_scan(case_dir, cid)
            old_vuln = db_bg.query(PhaseResult).filter(
                PhaseResult.case_id == case_uuid,
                PhaseResult.phase == "vulnerability"
            ).first()
            if old_vuln:
                db_bg.delete(old_vuln)
            db_bg.add(PhaseResult(
                case_id=case_uuid, phase="vulnerability",
                result=vuln_result, risk_score=vuln_result.get("risk_score", 0),
                completed_at=_parse_dt(vuln_result.get("completed_at"))
            ))
            db_bg.commit()

            logger.info("Pentest session finalized with C2 + Vuln re-analysis!")
        except Exception as e:
            logger.error(f"Pentest finalization failed: {e}")
        finally:
            db_bg.close()

    thread = threading.Thread(
        target=_finalize_bg,
        args=(str(case.id), session_id, case.apk_name),
        daemon=True
    )
    thread.start()

    return {"status": "stopping", "message": "Monitoring stopped. Report is being generated."}


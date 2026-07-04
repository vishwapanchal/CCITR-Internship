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
            logger.info("On-demand dynamic analysis complete!")
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

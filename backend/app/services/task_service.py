from celery import Celery
from app.config import settings
import time
from app.models.session import SessionLocal
from app.models.database import Case

celery_app = Celery(
    "apex_x_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="analyze_apk_task")
def analyze_apk_task(case_id: str, run_static: bool = True, run_dynamic: bool = True):
    """
    Background task to orchestrate analysis phases.
    Executes Static and Dynamic analysis engines and stores results in the database.
    """
    from app.engines.static import run_full_static_analysis
    from app.engines.dynamic import run_full_dynamic_analysis
    from app.models.database import PhaseResult
    import os
    import logging

    logger = logging.getLogger(__name__)
    logger.info(f"Starting analysis for Case ID: {case_id}")
    
    db = SessionLocal()
    try:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            logger.error(f"Case {case_id} not found")
            return {"error": "case_not_found"}
            
        case.status = "running"
        db.commit()
        
        # Determine paths
        DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "cases")
        case_dir = os.path.join(DATA_DIR, str(case_id))
        apk_path = os.path.join(case_dir, case.apk_name)
        
        if not os.path.exists(apk_path):
            case.status = "failed"
            db.commit()
            logger.error(f"APK file not found for case {case_id}: {apk_path}")
            return {"error": "apk_not_found"}

        # 1. Static Analysis Phase
        if run_static:
            logger.info(f"Running Static Analysis for {case_id}")
            static_result = run_full_static_analysis(apk_path, case_dir)
            
            # Save static phase result
            phase_record = PhaseResult(
                case_id=case_id,
                phase="static",
                result=static_result,
                risk_score=static_result.get("risk_score", 0),
                completed_at=static_result.get("completed_at")
            )
            db.add(phase_record)
            db.commit()
            
            logger.info(f"Static Analysis completed for {case_id} with score {phase_record.risk_score}")

        # 2. Dynamic Analysis Phase
        if run_dynamic:
            logger.info(f"Running Dynamic Analysis for {case_id}")
            dynamic_result = run_full_dynamic_analysis(apk_path, case_dir, duration=60)
            
            # Save dynamic phase result
            phase_record = PhaseResult(
                case_id=case_id,
                phase="dynamic",
                result=dynamic_result,
                risk_score=dynamic_result.get("risk_score", 0),
                completed_at=dynamic_result.get("completed_at")
            )
            db.add(phase_record)
            db.commit()
            
            logger.info(f"Dynamic Analysis completed for {case_id} with score {phase_record.risk_score}")

        # 3. Complete Case
        case.status = "completed"
        db.commit()
        logger.info(f"Successfully completed all analysis for Case ID: {case_id}")
        return {"case_id": case_id, "status": "completed"}
        
    except Exception as e:
        logger.error(f"Analysis task failed for case {case_id}: {e}")
        db.rollback()
        
        case = db.query(Case).filter(Case.id == case_id).first()
        if case:
            case.status = "failed"
            db.commit()
            
        return {"case_id": case_id, "status": "failed", "error": str(e)}
    finally:
        db.close()

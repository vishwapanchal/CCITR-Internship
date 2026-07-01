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
def analyze_apk_task(case_id: int):
    """
    Background task to orchestrate analysis phases.
    TM2 will integrate their static and dynamic engines here.
    """
    print(f"Starting analysis for Case ID: {case_id}")
    
    # 1. Update status to 'running'
    db = SessionLocal()
    case = db.query(Case).filter(Case.id == case_id).first()
    if case:
        case.status = "running"
        db.commit()
    
    # 2. Simulate heavy analysis
    time.sleep(5)  # Simulate TM2 engines running
    
    # 3. Update status to 'completed'
    if case:
        case.status = "completed"
        db.commit()
    db.close()
    
    print(f"Completed analysis for Case ID: {case_id}")
    return {"case_id": case_id, "status": "completed"}

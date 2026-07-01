from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import dependencies
from app.api.middleware.rbac import get_current_user
from app.services.hash_service import calculate_sha256, append_to_manifest
from app.utils.file_utils import is_valid_apk, save_upload_file
from app.services.task_service import analyze_apk_task
from app.services.audit_service import log_action
from app.models.database import Case, User
from app.models.schemas import Case as CaseSchema
import uuid
import os
import shutil

router = APIRouter()

# Data directory for local storage
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "cases")

@router.post("/upload/", response_model=CaseSchema, status_code=status.HTTP_201_CREATED)
async def upload_apk(
    file: UploadFile = File(...),
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".apk"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .apk files are allowed."
        )
    
    # 1. Hash the uploaded file
    await file.seek(0)
    apk_hash = calculate_sha256(file.file)
    await file.seek(0)
    
    # Check if a case with this hash already exists
    existing_case = db.query(Case).filter(Case.apk_hash == apk_hash).first()
    if existing_case:
        return existing_case

    # 2. Store temporarily to validate ZIP structure
    temp_path = os.path.join(DATA_DIR, "temp", file.filename)
    if not save_upload_file(file, temp_path):
        raise HTTPException(status_code=500, detail="Failed to save uploaded file temporarily.")
        
    if not is_valid_apk(temp_path):
        os.remove(temp_path)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid APK structure. Missing AndroidManifest.xml.")

    # 3. Create new case in database
    case_number = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    new_case = Case(
        case_number=case_number,
        apk_hash=apk_hash,
        apk_name=file.filename,
        status="pending",
        created_by=current_user.id
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    # 4. Move file to permanent secure storage
    case_dir = os.path.join(DATA_DIR, str(new_case.id))
    os.makedirs(case_dir, exist_ok=True)
    permanent_path = os.path.join(case_dir, file.filename)
    shutil.move(temp_path, permanent_path)
    
    # 5. Build sha256 manifest
    append_to_manifest(case_dir, file.filename, apk_hash)
    
    # 6. Log the upload action
    log_action(
        db=db,
        action="APK_UPLOADED",
        case_id=new_case.id,
        user_id=current_user.id,
        details={"filename": file.filename, "hash": apk_hash}
    )
    
    # 7. Trigger Background Task
    analyze_apk_task.delay(new_case.id)
    
    return new_case


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

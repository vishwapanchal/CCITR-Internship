from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from uuid import UUID

from app.api.dependencies import get_db
from app.models.database import Case, PhaseResult

router = APIRouter()

@router.get("/{case_id}/results")
def get_case_results(case_id: UUID, phase: str = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Retrieve the analysis results for a specific case.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    query = db.query(PhaseResult).filter(PhaseResult.case_id == case_id)
    if phase:
        query = query.filter(PhaseResult.phase == phase)
        
    phase_results = query.all()
    
    results_dict = {}
    for pr in phase_results:
        results_dict[pr.phase] = pr.result
    
    return {
        "status": case.status,
        "results": results_dict
    }

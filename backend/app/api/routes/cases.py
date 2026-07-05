from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api.dependencies import get_db
from app.models.database import Case, PhaseResult
from app.models.schemas import Case as CaseSchema

router = APIRouter()


@router.get("/threat-map")
def get_threat_map(db: Session = Depends(get_db)):
    """
    Aggregate IP geolocation data from all analyzed C2 results
    for the interactive world threat map visualization.
    """
    markers = []
    arcs = []
    seen_ips = set()

    # Get all C2 intelligence phase results
    c2_phases = db.query(PhaseResult).filter(PhaseResult.phase == "c2_intelligence").all()

    for phase in c2_phases:
        if not phase.result:
            continue

        result = phase.result
        nodes = result.get("nodes", [])
        attribution = result.get("attribution", {})
        case = db.query(Case).filter(Case.id == phase.case_id).first()
        case_name = case.apk_name if case else "Unknown"
        target_region = attribution.get("target_region", "India")

        # Default origin coordinates (India)
        origin_coords = {"lat": 20.5937, "lng": 78.9629}
        region_coords = {
            "India": {"lat": 20.5937, "lng": 78.9629},
            "China": {"lat": 35.8617, "lng": 104.1954},
            "Russia": {"lat": 61.524, "lng": 105.3188},
            "Brazil": {"lat": -14.235, "lng": -51.9253},
            "Global": {"lat": 20.5937, "lng": 78.9629},
        }
        origin = region_coords.get(target_region, origin_coords)

        for node in nodes:
            if node.get("type") != "ip":
                continue

            meta = node.get("metadata", {})
            lat = meta.get("lat", 0)
            lng = meta.get("lng", 0)
            ip = node.get("label", "")

            if not lat and not lng:
                continue
            if ip in seen_ips:
                continue
            seen_ips.add(ip)

            markers.append({
                "ip": ip,
                "lat": lat,
                "lng": lng,
                "country": meta.get("country", ""),
                "city": meta.get("city", ""),
                "org": meta.get("asn", ""),
                "classification": meta.get("classification", "unknown"),
                "risk": node.get("risk", "medium"),
                "case_name": case_name,
            })

            arcs.append({
                "from": origin,
                "to": {"lat": lat, "lng": lng},
                "case_name": case_name,
                "classification": meta.get("classification", "unknown"),
            })

    return {"markers": markers, "arcs": arcs}

@router.get("/", response_model=List[CaseSchema])
def get_cases(db: Session = Depends(get_db)):
    """
    Retrieve all cases and compute their threat_score from phase results.
    """
    cases = db.query(Case).all()
    for case in cases:
        # Calculate max risk score across all phases
        risk_scores = [p.risk_score for p in case.phase_results if p.risk_score is not None]
        case.threat_score = max(risk_scores) if risk_scores else 0
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
        
    risk_scores = [p.risk_score for p in case.phase_results if p.risk_score is not None]
    case.threat_score = max(risk_scores) if risk_scores else 0
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

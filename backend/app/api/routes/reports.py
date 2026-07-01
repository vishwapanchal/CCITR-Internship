import os
import sys
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import datetime

# Add root directory to sys.path to import apex_x
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from apex_x.reporting.pdf_generator import PDFGenerator
from apex_x.reporting.evidence_packager import EvidencePackager

router = APIRouter()

# Setup directories
REPORTS_DIR = os.path.join(root_dir, "data", "reports")
CASES_DIR = os.path.join(root_dir, "data", "cases")
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(CASES_DIR, exist_ok=True)

# Mock data for template generation
MOCK_REPORT_DATA = {
    "metadata": {
        "case_number": "CASE-8F4E9A0C",
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "classification": "CONFIDENTIAL"
    },
    "executive_summary": {
        "threat_score": 87,
        "verdict": "MALICIOUS — Spyware with C2 capabilities",
        "key_findings": [
            "Dynamic DEX loading detected",
            "C2 Beaconing via HTTPS",
            "Exfiltration of SMS and Contact Data"
        ]
    },
    "apk_profile": {
        "file_name": "com.whatsapp.update.apk",
        "package_name": "com.hidden.spyware.v2",
        "sha256": "8f4e9a0c2b5d1e7f3a6c8d9b0e2f4a5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1"
    }
}

@router.get("/{case_id}/download")
async def download_report(case_id: str, language: str = "en"):
    """
    Generates and returns the PDF report for the given case.
    """
    try:
        generator = PDFGenerator(REPORTS_DIR)
        
        # In a real scenario, fetch real data from database using case_id
        # For now, we use the mock data
        report_data = MOCK_REPORT_DATA.copy()
        report_data["metadata"]["case_number"] = f"CASE-{case_id[:8].upper()}"
        
        # Generate the PDF
        pdf_path = generator.generate_report(case_id, report_data, language)
        
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
            
        return FileResponse(
            path=pdf_path,
            filename=f"Report_{case_id}_{language}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@router.get("/{case_id}/evidence-package")
async def download_evidence_package(case_id: str):
    """
    Generates and returns the Section 65B ZIP evidence package.
    """
    try:
        packager = EvidencePackager(CASES_DIR, os.path.join(root_dir, "keys"))
        case_number = f"CASE-{case_id[:8].upper()}"
        
        # Create case dir if it doesn't exist for mock purposes
        case_dir = os.path.join(CASES_DIR, case_id)
        os.makedirs(case_dir, exist_ok=True)
        
        # Create a dummy file to zip if empty
        dummy_file = os.path.join(case_dir, "mock_evidence.txt")
        if not os.path.exists(dummy_file):
            with open(dummy_file, "w") as f:
                f.write(f"Mock evidence for {case_number}")
        
        zip_path = packager.package_case(case_id, case_number)
        
        if not os.path.exists(zip_path):
            raise HTTPException(status_code=500, detail="Failed to generate evidence package")
            
        return FileResponse(
            path=zip_path,
            filename=f"evidence_package_{case_id}.zip",
            media_type="application/zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error packaging evidence: {str(e)}")

"""Run full dynamic analysis with the live emulator and update the database."""
import os, sys, json
sys.path.insert(0, r"C:\Users\ASUS\OneDrive\Desktop\Apex-X\backend")

from app.engines.dynamic import run_full_dynamic_analysis
from app.models.session import SessionLocal
from app.models.database import PhaseResult
from datetime import datetime
import uuid

CASE_ID = "3fcf6994-6897-4f3c-a4e6-7d0afb11ca21"
case_dir = rf"C:\Users\ASUS\OneDrive\Desktop\Apex-X\backend\app\data\cases\{CASE_ID}"
apk_path = os.path.join(case_dir, "InsecureShop.apk")

print("Running dynamic analysis with live emulator...")
result = run_full_dynamic_analysis(apk_path, case_dir, duration=10, force_emulator=False)

print(f"Mode: {result.get('mode')}")
print(f"Status: {result.get('status')}")
print(f"Events: {result.get('total_events')}")
print(f"Network: {len(result.get('network_activity', []))}")
for e in result.get("events", [])[:5]:
    print(f"  [{e.get('category')}] {e.get('api_call')} - {e.get('class_name')}")

# Update the database
db = SessionLocal()
case_uuid = uuid.UUID(CASE_ID)
old = db.query(PhaseResult).filter(PhaseResult.case_id == case_uuid, PhaseResult.phase == "dynamic").first()
if old:
    db.delete(old)

phase = PhaseResult(
    case_id=case_uuid,
    phase="dynamic",
    result=result,
    risk_score=result.get("risk_score", 0),
    completed_at=datetime.utcnow()
)
db.add(phase)
db.commit()
db.close()
print("Database updated!")

import os
import json
import logging
import shutil
import time
from app.engines.dynamic import run_full_dynamic_analysis

# Configure logging for test output
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def run_pipeline():
    print("Starting Real Dynamic Analysis Pipeline Test...")
    
    # Setup paths
    dummy_apk = "dummy.apk"
    case_dir = "test_case_dir_dynamic"
    
    # 1. Create a dummy APK file 
    with open(dummy_apk, "wb") as f:
        f.write(b"PK\x03\x04") # Minimal zip header
        
    try:
        # We need to make sure we don't fail immediately if tools aren't installed 
        # (e.g. no Android VM running, no frida, etc)
        # The new engine will attempt each step and log errors gracefully
        print("\n[+] Running full dynamic analysis orchestrator (Duration: 5s)...")
        
        # We use a short duration for the test
        results = run_full_dynamic_analysis(dummy_apk, case_dir, duration=5)
        
        print("\n=== PIPELINE RESULTS ===")
        summary = {
            "status": results.get("status"),
            "duration": results.get("duration_seconds"),
            "risk_score": results.get("risk_score"),
            "errors": results.get("errors", []),
            "steps_completed": [k for k, v in results.get("steps", {}).items() if v.get("status") == "success"],
            "steps_failed": [k for k, v in results.get("steps", {}).items() if v.get("status") in ["failed", "error"]]
        }
        print(json.dumps(summary, indent=4))
        
        report_path = os.path.join(case_dir, "dynamic_analysis", "dynamic_report.json")
        if os.path.exists(report_path):
            print(f"\nFull results saved to: {report_path}")
        else:
            print(f"\nReport file not generated. Pipeline may have failed early.")
        
    finally:
        # Cleanup
        if os.path.exists(dummy_apk):
            os.remove(dummy_apk)
        if os.path.exists(case_dir):
            shutil.rmtree(case_dir, ignore_errors=True)
            
        print("Pipeline execution finished.")

if __name__ == "__main__":
    run_pipeline()

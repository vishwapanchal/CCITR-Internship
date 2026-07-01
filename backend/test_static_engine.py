import os
import json
from app.engines.static import apktool_wrapper
from app.engines.static import jadx_wrapper
from app.engines.static import androguard_analyzer
from app.engines.static import manifest_parser
from app.engines.static import ioc_extractor
from app.engines.static import risk_scorer

def run_pipeline():
    print("Starting Static Analysis Pipeline Test...")
    
    # Setup dummy paths
    dummy_apk = "dummy.apk"
    output_dir = "test_output"
    
    # 1. Create a dummy APK file just for the mocks to detect its existence
    with open(dummy_apk, "w") as f:
        f.write("DUMMY APK CONTENT")
        
    try:
        results = {}
        
        # 2. Run APKTool mock
        print("[+] Running APKTool Wrapper...")
        apktool_dir = os.path.join(output_dir, "apktool_out")
        extracted_dir = apktool_wrapper.decompile_apk(dummy_apk, apktool_dir)
        
        # 3. Parse Manifest
        print("[+] Parsing Manifest...")
        manifest_path = os.path.join(extracted_dir, "AndroidManifest.xml") if extracted_dir else ""
        manifest_results = manifest_parser.parse_manifest(manifest_path)
        results["permissions"] = manifest_results
        
        # 4. Run JADX mock
        print("[+] Running JADX Wrapper...")
        jadx_dir = os.path.join(output_dir, "jadx_out")
        jadx_wrapper.extract_java_source(dummy_apk, jadx_dir)
        
        # 5. Extract IOCs from both outputs
        print("[+] Extracting IOCs...")
        iocs = ioc_extractor.extract_iocs_from_directory(output_dir)
        results["iocs"] = iocs
        
        # 6. Run Androguard mock
        print("[+] Running Androguard Analyzer...")
        androguard_results = androguard_analyzer.analyze_apk(dummy_apk)
        results["androguard"] = androguard_results
        
        # 7. Compute Risk Score
        print("[+] Computing Static Risk Score...")
        # Add mock yara matches for testing
        results["yara_matches"] = ["BankBot_String", "Suspicious_Packer"]
        
        score = risk_scorer.compute_static_risk(results)
        results["static_risk_score"] = score
        
        print("\n=== PIPELINE RESULTS ===")
        print(json.dumps(results, indent=4))
        
    finally:
        # Cleanup
        if os.path.exists(dummy_apk):
            os.remove(dummy_apk)
        # We don't remove output_dir so we can inspect it if needed
        print("Pipeline execution finished.")

if __name__ == "__main__":
    run_pipeline()

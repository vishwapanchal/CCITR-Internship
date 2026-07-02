import os
import json
import logging
import shutil
import unittest
from unittest.mock import patch, MagicMock

from app.engines.static import run_full_static_analysis
from app.engines.static import risk_scorer
from app.engines.static import ioc_extractor

# Configure logging for test output
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

class TestStaticEngine(unittest.TestCase):
    def setUp(self):
        self.dummy_apk = "dummy_test.apk"
        self.case_dir = "test_case_dir_static"
        
        # Create a dummy APK file 
        with open(self.dummy_apk, "wb") as f:
            f.write(b"PK\x03\x04") # Minimal zip header
            
    def tearDown(self):
        # Cleanup dummy file
        if os.path.exists(self.dummy_apk):
            os.remove(self.dummy_apk)
        # Clean up output dir for next test
        if os.path.exists(self.case_dir):
            shutil.rmtree(self.case_dir, ignore_errors=True)

    @patch('app.engines.static.apktool_wrapper.decompile_apk')
    @patch('app.engines.static.jadx_wrapper.extract_java_source')
    @patch('app.engines.static.androguard_analyzer.analyze_apk')
    def test_full_static_analysis_pipeline(self, mock_androguard, mock_jadx, mock_apktool):
        # Setup mocks
        mock_apktool.return_value = os.path.join(self.case_dir, "static_analysis", "apktool_output")
        mock_jadx.return_value = os.path.join(self.case_dir, "static_analysis", "jadx_output")
        mock_androguard.return_value = {
            "package_name": "com.test.app",
            "permissions": {"dangerous": ["android.permission.CAMERA"]}
        }
        
        # We need to create the mock output directories so that subsequent steps don't fail immediately
        os.makedirs(mock_apktool.return_value, exist_ok=True)
        os.makedirs(mock_jadx.return_value, exist_ok=True)
        
        # Create a dummy manifest
        with open(os.path.join(mock_apktool.return_value, "AndroidManifest.xml"), "w") as f:
            f.write('<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.test.app"></manifest>')

        results = run_full_static_analysis(self.dummy_apk, self.case_dir)
        
        self.assertEqual(results["status"], "completed")
        self.assertEqual(results["phase"], "static")
        self.assertIn("apktool", results["steps"])
        self.assertIn("jadx", results["steps"])
        self.assertIn("androguard", results["steps"])
        self.assertIsNotNone(results.get("risk_score"))

    def test_risk_scorer(self):
        # Test with high risk indicators
        results = {
            "permissions": {
                "dangerous": ["android.permission.CAMERA", "android.permission.READ_SMS"],
                "malware_indicators": ["android.permission.SYSTEM_ALERT_WINDOW"]
            },
            "iocs": {
                "ips": ["1.1.1.1", "2.2.2.2"],
                "urls": ["http://malicious.com"]
            },
            "yara_matches": ["Android_Banking_Trojan_Overlay"], # Note: The orchestrator passes yara_matches as a list of strings
            "api_calls": {
                "high_risk": [{"api": "Ljava/lang/Runtime;->exec"}]
            }
        }
        
        score_details = risk_scorer.compute_static_risk(results)
        
        # Depending on the weight, it might be around 30-40 with these inputs, so just verify it calculates something > 10
        self.assertTrue(score_details["total_score"] > 10) 
        
    def test_ioc_extractor_regex(self):
        # Create a temporary dummy file to test IOC extraction
        test_file = "test_ioc.txt"
        with open(test_file, "w") as f:
            f.write("Contact us at test@malicious.com or visit http://malicious.com. IP: 8.8.8.8. Also my wallet is bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")
            
        try:
            extracted = ioc_extractor.extract_iocs_from_file(test_file)
            
            self.assertIn("http://malicious.com", extracted["urls"])
            self.assertIn("8.8.8.8", extracted["ips"])
            self.assertIn("test@malicious.com", extracted["emails"])
            self.assertTrue(any("bc1" in w for w in extracted["crypto_wallets"]))
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

if __name__ == "__main__":
    unittest.main()

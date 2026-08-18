import unittest
from app.engines.static.mo_classifier import classify_mo

class TestMOClassifier(unittest.TestCase):
    def test_classify_mo_sms_intercept(self):
        ag_data = {
            "permissions": ["android.permission.RECEIVE_SMS", "android.permission.INTERNET"]
        }
        mos = classify_mo({}, ag_data)
        self.assertIn("MO_SMS_INTERCEPT", mos)

    def test_classify_mo_banking_overlay(self):
        ag_data = {
            "permissions": ["android.permission.SYSTEM_ALERT_WINDOW", "android.permission.BIND_ACCESSIBILITY_SERVICE"]
        }
        mos = classify_mo({}, ag_data)
        self.assertIn("MO_BANKING_OVERLAY", mos)

    def test_classify_mo_ransomware(self):
        ag_data = {
            "permissions": ["android.permission.WAKE_LOCK", "android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.SYSTEM_ALERT_WINDOW"]
        }
        mos = classify_mo({}, ag_data)
        self.assertIn("MO_RANSOMWARE_LOCKER", mos)

    def test_classify_mo_dynamic_payload(self):
        ag_data = {
            "permissions": ["android.permission.INTERNET"],
            "api_calls": {
                "high_risk": ["dalvik.system.DexClassLoader;->loadClass"]
            }
        }
        mos = classify_mo({}, ag_data)
        self.assertIn("MO_DYNAMIC_PAYLOAD_DOWNLOADER", mos)

    def test_classify_mo_rat_abuse(self):
        static_results = {
            "remote_access_abuse": {"flagged": True}
        }
        mos = classify_mo(static_results, {})
        self.assertIn("MO_RAT_ABUSE", mos)

    def test_classify_mo_emulator_evasion(self):
        ag_data = {
            "permissions": [],
            "api_calls": {
                "high_risk": [{"api": "android/os/Build;->MODEL"}]
            }
        }
        mos = classify_mo({}, ag_data)
        self.assertIn("MO_EMULATOR_EVASION", mos)

if __name__ == "__main__":
    unittest.main()

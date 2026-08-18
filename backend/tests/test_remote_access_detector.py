import os
import tempfile
import unittest
from app.engines.static.remote_access_detector import detect_remote_access_abuse

class TestRemoteAccessDetector(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        
        # Create fake smali structure
        self.smali_dir = os.path.join(self.test_dir, "smali", "com", "anydesk")
        os.makedirs(self.smali_dir, exist_ok=True)
        with open(os.path.join(self.smali_dir, "FakeClass.smali"), "w") as f:
            f.write(".class public Lcom/anydesk/FakeClass;\n")

    def tearDown(self):
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_detect_remote_access_abuse(self):
        manifest_data = {
            "permissions": {
                "all": [
                    "android.permission.BIND_ACCESSIBILITY_SERVICE",
                    "android.permission.SYSTEM_ALERT_WINDOW",
                    "android.permission.INTERNET"
                ]
            }
        }
        
        result = detect_remote_access_abuse(manifest_data, self.test_dir)
        
        self.assertTrue(result["flagged"])
        self.assertTrue(result["accessibility_service"])
        self.assertTrue(result["overlay_permission"])
        self.assertEqual(result["bundled_sdk"], "AnyDesk SDK")

    def test_missing_permissions(self):
        manifest_data = {
            "permissions": {
                "all": [
                    "android.permission.INTERNET"
                ]
            }
        }
        
        result = detect_remote_access_abuse(manifest_data, self.test_dir)
        
        self.assertFalse(result["flagged"])
        self.assertFalse(result["accessibility_service"])
        self.assertFalse(result["overlay_permission"])
        self.assertIsNone(result["bundled_sdk"])

if __name__ == "__main__":
    unittest.main()

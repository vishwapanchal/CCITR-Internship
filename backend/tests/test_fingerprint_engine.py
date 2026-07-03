import os
import tempfile
import unittest
from app.engines.static.fingerprint_engine import compute_structural_fingerprint, similarity_score

class TestFingerprintEngine(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.smali_dir = os.path.join(self.test_dir, "smali", "com", "example")
        os.makedirs(self.smali_dir, exist_ok=True)
        with open(os.path.join(self.test_dir, "AndroidManifest.xml"), "w") as f:
            f.write("<manifest></manifest>")

    def tearDown(self):
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_compute_and_similarity(self):
        ag_data_1 = {
            "permissions": ["android.permission.INTERNET", "android.permission.CAMERA"],
            "api_calls": {
                "high_risk": ["Ljava/lang/Runtime;->exec", "Landroid/telephony/SmsManager;->sendTextMessage"]
            }
        }
        
        fp1 = compute_structural_fingerprint(ag_data_1, self.test_dir)
        
        self.assertIn("permission_set_hash", fp1)
        self.assertIn("class_shape_hash", fp1)
        self.assertIn("fingerprint_id", fp1)
        self.assertEqual(len(fp1["api_call_signature"]), 2)
        
        # Test similarity with itself
        self.assertEqual(similarity_score(fp1, fp1), 1.0)
        
        # Test similarity with slightly modified fingerprint
        ag_data_2 = {
            "permissions": ["android.permission.INTERNET"], # changed
            "api_calls": {
                "high_risk": ["Ljava/lang/Runtime;->exec", "Landroid/telephony/SmsManager;->sendTextMessage"]
            }
        }
        fp2 = compute_structural_fingerprint(ag_data_2, self.test_dir)
        
        score = similarity_score(fp1, fp2)
        self.assertTrue(0.5 < score < 1.0) # Should be partially similar but not identical

if __name__ == "__main__":
    unittest.main()

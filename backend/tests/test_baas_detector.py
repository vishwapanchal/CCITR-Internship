import os
import tempfile
import unittest
from app.engines.static.baas_detector import detect_baas_backends, enrich_baas_exposure

class TestBaaSDetector(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        
        with open(os.path.join(self.test_dir, "strings.xml"), "w") as f:
            f.write('<string name="firebase_database_url">https://malicious-app-992a.firebaseio.com</string>')
            
        with open(os.path.join(self.test_dir, "config.json"), "w") as f:
            f.write('{"url": "https://supabase-proj-xyz.supabase.co", "key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.signature"}')

    def tearDown(self):
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_detect_baas_backends(self):
        result = detect_baas_backends([self.test_dir])
        
        self.assertEqual(len(result["firebase_projects"]), 1)
        self.assertEqual(result["firebase_projects"][0]["project_id"], "malicious-app-992a")
        
        self.assertEqual(len(result["supabase_projects"]), 1)
        self.assertEqual(result["supabase_projects"][0]["project_id"], "supabase-proj-xyz")
        self.assertIsNotNone(result["supabase_projects"][0]["anon_key"])

    def test_enrich_baas_exposure_disabled(self):
        # Without network enrichment
        data = {"firebase_projects": [{"url": "https://dummy.firebaseio.com", "project_id": "dummy"}]}
        result = enrich_baas_exposure(data, allow_network=False)
        self.assertNotIn("publicly_readable", result["firebase_projects"][0])

if __name__ == "__main__":
    unittest.main()

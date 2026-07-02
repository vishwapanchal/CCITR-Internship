import os
import json
import logging
import shutil
import unittest
from unittest.mock import patch, MagicMock

# Ensure settings are loaded before other imports
from app.config import settings

# Mock database before importing the service
from sqlalchemy.orm import Session
from app.models.database import Case, PhaseResult

from app.services.task_service import analyze_apk_task

# Configure logging for test output
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

class TestIntegrationAnalysis(unittest.TestCase):
    def setUp(self):
        self.dummy_apk = "dummy_test_integration.apk"
        
        self.case_id = "test-case-1234"
        self.case_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            "data", "cases", self.case_id
        )
        
        os.makedirs(self.case_dir, exist_ok=True)
        self.apk_path = os.path.join(self.case_dir, "test.apk")
        
        # Create a dummy APK file 
        with open(self.apk_path, "wb") as f:
            f.write(b"PK\x03\x04") # Minimal zip header
            
    def tearDown(self):
        # Cleanup
        if os.path.exists(self.dummy_apk):
            os.remove(self.dummy_apk)
        if os.path.exists(self.case_dir):
            shutil.rmtree(self.case_dir, ignore_errors=True)

    @patch('app.services.task_service.SessionLocal')
    @patch('app.engines.static.run_full_static_analysis')
    @patch('app.engines.dynamic.run_full_dynamic_analysis')
    @patch('app.engines.c2.run_full_c2_intelligence')
    @patch('app.engines.vulnerability.run_vulnerability_scan')
    @patch('app.engines.intelligence.threat_reasoner.generate_threat_narrative')
    @patch('app.engines.intelligence.copilot_rag.index_case_artifacts')
    def test_analyze_apk_task_full(
        self, mock_index_rag, mock_threat_reasoner, mock_vuln, mock_c2, 
        mock_dynamic, mock_static, mock_session_maker
    ):
        # Setup DB mocks
        mock_db = MagicMock(spec=Session)
        mock_session_maker.return_value = mock_db
        
        # Setup case mock
        mock_case = MagicMock(spec=Case)
        mock_case.id = self.case_id
        mock_case.apk_name = "test.apk"
        
        # Setup query chain: db.query(Case).filter().first() -> mock_case
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = mock_case
        mock_query.filter.return_value = mock_filter
        
        # When querying Case, return our mock case chain. Otherwise, return generic
        def query_side_effect(model):
            if model == Case:
                return mock_query
            return MagicMock()
            
        mock_db.query.side_effect = query_side_effect
        
        # Setup Analysis Engine mocks
        mock_static.return_value = {
            "phase": "static",
            "status": "completed",
            "risk_score": 85,
            "completed_at": "2023-01-01T12:00:00Z"
        }
        
        mock_dynamic.return_value = {
            "phase": "dynamic",
            "status": "completed",
            "risk_score": 92,
            "completed_at": "2023-01-01T12:05:00Z"
        }
        
        mock_c2.return_value = {
            "phase": "c2",
            "status": "completed",
            "risk_score": 40,
            "completed_at": "2023-01-01T12:06:00Z"
        }
        
        mock_vuln.return_value = {
            "phase": "vulnerability",
            "status": "completed",
            "risk_score": 84,
            "completed_at": "2023-01-01T12:07:00Z"
        }
        
        mock_threat_reasoner.return_value = {
            "status": "success",
            "narrative_text": "Mock narrative."
        }
        
        mock_index_rag.return_value = True
        
        # Execute the task directly (synchronously)
        result = analyze_apk_task(self.case_id, run_static=True, run_dynamic=True)
        
        # Verify success
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["case_id"], self.case_id)
        
        # Verify all engines were called in the pipeline
        mock_static.assert_called_once_with(self.apk_path, self.case_dir)
        mock_dynamic.assert_called_once_with(self.apk_path, self.case_dir, duration=60)
        mock_c2.assert_called_once_with(self.apk_path, self.case_dir, str(self.case_id))
        mock_vuln.assert_called_once_with(self.case_dir, str(self.case_id))
        mock_threat_reasoner.assert_called_once_with(self.case_dir)
        mock_index_rag.assert_called_once_with(str(self.case_id), self.case_dir)
        
        # Verify db phase results were added (static, dynamic, c2, vuln, threat)
        self.assertEqual(mock_db.add.call_count, 5)
        
        # Verify status updates
        self.assertEqual(mock_case.status, "completed")
        # Should be called for: running, commit static, commit dynamic, commit completed
        self.assertTrue(mock_db.commit.call_count >= 4)
        
if __name__ == "__main__":
    unittest.main()

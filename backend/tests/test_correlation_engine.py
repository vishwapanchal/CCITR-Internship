import unittest
from unittest.mock import patch, MagicMock
from app.engines.c2.correlation_engine import find_correlated_cases

class TestCorrelationEngine(unittest.TestCase):
    
    @patch("app.engines.c2.correlation_engine._get_driver")
    def test_find_correlated_cases(self, mock_get_driver):
        # Mock Neo4j driver and session
        mock_driver = MagicMock()
        mock_session = MagicMock()
        mock_get_driver.return_value = mock_driver
        mock_driver.session.return_value.__enter__.return_value = mock_session
        
        # Mock the result of session.run
        mock_result = [
            {
                "related_case": "case-1234",
                "shared_type": "Domain",
                "shared_value": "malicious.com",
                "related_package": "com.bad.app"
            },
            {
                "related_case": "case-1234",
                "shared_type": "IPAddress",
                "shared_value": "1.2.3.4",
                "related_package": "com.bad.app"
            },
            {
                "related_case": "case-5678",
                "shared_type": "BaaSProject",
                "shared_value": "scam-project-id",
                "related_package": "com.other.app"
            }
        ]
        mock_session.run.return_value = mock_result
        
        result = find_correlated_cases("case-9999", "dummy_hash")
        
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["total_correlated_cases"], 2)
        
        cases = {c["case_id"]: c for c in result["correlations"]}
        self.assertIn("case-1234", cases)
        self.assertIn("case-5678", cases)
        
        self.assertEqual(len(cases["case-1234"]["shared_nodes"]), 2)
        self.assertEqual(cases["case-1234"]["related_package"], "com.bad.app")
        
        self.assertEqual(len(cases["case-5678"]["shared_nodes"]), 1)
        self.assertEqual(cases["case-5678"]["shared_nodes"][0]["value"], "scam-project-id")

if __name__ == "__main__":
    unittest.main()

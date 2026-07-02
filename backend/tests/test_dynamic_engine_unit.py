import os
import json
import logging
import shutil
import unittest
from unittest.mock import patch, MagicMock

from app.engines.dynamic import run_full_dynamic_analysis
from app.engines.dynamic import behavior_aggregator

# Configure logging for test output
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

class TestDynamicEngine(unittest.TestCase):
    def setUp(self):
        self.dummy_apk = "dummy_test_dynamic.apk"
        self.case_dir = "test_case_dir_dynamic"
        
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

    @patch('app.engines.dynamic.vm_orchestrator.start_emulator')
    @patch('app.engines.dynamic.vm_orchestrator.list_devices')
    @patch('app.engines.dynamic.vm_orchestrator.install_apk')
    @patch('app.engines.dynamic.vm_orchestrator.get_package_name')
    @patch('app.engines.dynamic.vm_orchestrator.run_monkey')
    @patch('app.engines.dynamic.vm_orchestrator.uninstall_apk')
    @patch('app.engines.dynamic.frida_manager.create_manager')
    @patch('app.engines.dynamic.traffic_capture.create_capture')
    @patch('app.engines.dynamic.pcap_analyzer.analyze_pcap')
    def test_full_dynamic_analysis_pipeline(
        self, mock_analyze_pcap, mock_create_capture, mock_create_frida,
        mock_uninstall, mock_monkey, mock_get_package, mock_install,
        mock_list_devices, mock_start_emulator
    ):
        # Setup mocks
        mock_list_devices.return_value = [] # No running devices
        mock_start_emulator.return_value = {"success": True, "serial": "emulator-5554"}
        mock_get_package.return_value = "com.test.app"
        mock_install.return_value = {"success": True}
        mock_monkey.return_value = {"success": True}
        
        # Mock Frida Manager
        mock_frida_mgr = MagicMock()
        mock_frida_mgr.connect_device.return_value = True
        mock_frida_mgr.attach_to_app.return_value = True
        mock_frida_mgr.inject_all_hooks.return_value = {"network_hook.js": True}
        mock_frida_mgr.collect_messages.return_value = [
            {"hook": "network", "event": "url_open_connection", "url": "http://malicious.com", "timestamp": "2023-01-01T12:00:00Z"},
            {"hook": "sms", "event": "send_sms", "destination": "12345", "timestamp": "2023-01-01T12:01:00Z"}
        ]
        mock_create_frida.return_value = mock_frida_mgr
        
        # Mock Traffic Capture
        mock_traffic_cap = MagicMock()
        mock_traffic_cap.stop_capture.return_value = {"pcap_path": "dummy.pcap", "pcap_size": 1024, "flows_count": 0}
        mock_create_capture.return_value = mock_traffic_cap
        
        # Mock PCAP Analyzer
        mock_analyze_pcap.return_value = {
            "status": "success",
            "dns_queries": ["malicious.com"],
            "http_requests": [{"method": "GET", "url": "http://malicious.com", "host": "malicious.com"}]
        }

        # Run pipeline with a very short duration
        results = run_full_dynamic_analysis(self.dummy_apk, self.case_dir, duration=1)
        
        self.assertEqual(results["status"], "completed")
        self.assertEqual(results["phase"], "dynamic")
        self.assertEqual(results["package_name"], "com.test.app")
        
        # Verify steps were executed
        self.assertEqual(results["steps"]["vm"]["status"], "success")
        self.assertEqual(results["steps"]["frida"]["status"], "success")
        
        # Verify behavior aggregator was called and produced a score
        self.assertIsNotNone(results.get("risk_score"))
        self.assertTrue(results.get("risk_score") > 0)
        self.assertTrue(results["behavior_profile"]["behaviors"]["data_exfiltration"])
        self.assertTrue(results["behavior_profile"]["behaviors"]["c2_communication"])

    def test_behavior_aggregator(self):
        frida_messages = [
            {"hook": "device", "event": "camera_open", "timestamp": "2023-01-01T12:00:00Z"},
            {"hook": "file", "event": "runtime_exec", "command": "su", "timestamp": "2023-01-01T12:01:00Z"}
        ]
        
        network_analysis = {
            "dns_queries": ["c2.example.com"],
            "http_requests": [{"method": "POST", "url": "http://c2.example.com/upload"}]
        }
        
        results = behavior_aggregator.aggregate_behaviors(frida_messages, network_analysis)
        
        self.assertTrue(results["behaviors"]["surveillance"])
        self.assertTrue(results["behaviors"]["command_execution"])
        self.assertTrue(results["behaviors"]["c2_communication"])
        
        self.assertTrue(results["risk_score"] >= 20)
        
        # Verify breakdown
        self.assertEqual(results["risk_breakdown"]["device"], 8) # camera_open
        self.assertEqual(results["risk_breakdown"]["file"], 10) # runtime_exec

if __name__ == "__main__":
    unittest.main()

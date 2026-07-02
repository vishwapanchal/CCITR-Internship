"""
Dynamic Analysis Engine — Orchestrator
Chains all dynamic analysis tools into a complete pipeline:
VM start → Install APK → Start Capture → Attach Frida → Inject Hooks →
Run UI Automation (Monkey) → Collect Results → Stop VM
"""

import os
import time
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.engines.dynamic import vm_orchestrator
from app.engines.dynamic import frida_manager
from app.engines.dynamic import traffic_capture
from app.engines.dynamic import pcap_analyzer
from app.engines.dynamic import behavior_aggregator

logger = logging.getLogger(__name__)

# Default analysis duration (seconds)
DEFAULT_ANALYSIS_DURATION = 60

def run_full_dynamic_analysis(
    apk_path: str, 
    case_dir: str, 
    duration: int = DEFAULT_ANALYSIS_DURATION
) -> Dict[str, Any]:
    """
    Execute the complete dynamic analysis pipeline on an APK file.
    
    Args:
        apk_path: Absolute path to the APK file.
        case_dir: Directory to store all analysis output.
        duration: How long to run the dynamic analysis (seconds).
        
    Returns:
        Comprehensive dynamic analysis result dict.
    """
    start_time = datetime.now(timezone.utc)
    
    result = {
        "phase": "dynamic",
        "status": "running",
        "apk_path": apk_path,
        "case_dir": case_dir,
        "started_at": start_time.isoformat(),
        "completed_at": None,
        "duration_seconds": None,
        "steps": {},
        "errors": [],
        "risk_score": None,
        "risk_breakdown": None,
    }
    
    # Create output directories
    dynamic_dir = os.path.join(case_dir, "dynamic_analysis")
    os.makedirs(dynamic_dir, exist_ok=True)
    
    device_serial = None
    package_name = None
    frida_mgr = None
    traffic_cap = None
    
    try:
        # ── Step 1: VM Orchestration ─────────────────────────────
        logger.info("Dynamic Step 1: VM Preparation")
        
        # In a real environment, we would start a fresh emulator.
        # For robustness, we'll try to use any existing running emulator/device first.
        devices = vm_orchestrator.list_devices()
        
        if devices:
            device_serial = devices[0]["serial"]
            logger.info(f"Using existing device: {device_serial}")
            result["steps"]["vm"] = {"status": "success", "device": device_serial, "reused": True}
        else:
            logger.info("Starting new Android emulator...")
            vm_result = vm_orchestrator.start_emulator()
            
            if vm_result["success"]:
                device_serial = vm_result["serial"]
                result["steps"]["vm"] = {"status": "success", "device": device_serial, "reused": False}
            else:
                raise Exception(f"Failed to start emulator: {vm_result.get('error')}")

        # Extract package name
        package_name = vm_orchestrator.get_package_name(apk_path)
        if not package_name:
            raise Exception("Could not determine package name from APK")
            
        result["package_name"] = package_name

        # Install APK
        logger.info(f"Installing {package_name}...")
        install_result = vm_orchestrator.install_apk(apk_path, device=device_serial)
        if not install_result["success"]:
            raise Exception(f"Failed to install APK: {install_result.get('error')}")
            
        # ── Step 2: Traffic Capture ──────────────────────────────
        logger.info("Dynamic Step 2: Starting Traffic Capture")
        traffic_cap = traffic_capture.create_capture(dynamic_dir)
        
        # Start TCPDump
        traffic_cap.start_tcpdump(device_serial=device_serial)
        
        # ── Step 3: Frida Instrumentation ────────────────────────
        logger.info("Dynamic Step 3: Frida Instrumentation")
        frida_mgr = frida_manager.create_manager()
        
        if frida_mgr.connect_device(device_id=device_serial):
            # We use 'spawn' to catch early execution
            if frida_mgr.attach_to_app(package_name, spawn=True):
                # Inject all hook scripts
                scripts_result = frida_mgr.inject_all_hooks()
                result["steps"]["frida"] = {
                    "status": "success", 
                    "scripts_loaded": scripts_result
                }
            else:
                result["steps"]["frida"] = {"status": "failed", "errors": frida_mgr.errors}
                result["errors"].extend(frida_mgr.errors)
        else:
            result["steps"]["frida"] = {"status": "failed", "errors": frida_mgr.errors}
            result["errors"].extend(frida_mgr.errors)
            
        # ── Step 4: UI Automation (Monkey) ───────────────────────
        logger.info(f"Dynamic Step 4: UI Automation for {duration} seconds")
        monkey_result = vm_orchestrator.run_monkey(
            package_name, 
            events=1000, 
            device=device_serial
        )
        
        # Let it run for the specified duration to gather dynamic events
        logger.info(f"Waiting {duration}s for dynamic events...")
        time.sleep(duration)
        
        # ── Step 5: Data Collection & Cleanup ────────────────────
        logger.info("Dynamic Step 5: Data Collection & Cleanup")
        
        # Collect Frida messages
        frida_messages = []
        if frida_mgr:
            frida_messages = frida_mgr.collect_messages()
            frida_mgr.detach()
            
        # Stop traffic capture
        capture_result = None
        if traffic_cap:
            capture_result = traffic_cap.stop_capture()
            
        # Uninstall the app to clean up the VM
        vm_orchestrator.uninstall_apk(package_name, device=device_serial)
        
        # ── Step 6: Analysis & Aggregation ───────────────────────
        logger.info("Dynamic Step 6: Analysis & Aggregation")
        
        # Analyze PCAP
        network_analysis = {}
        if capture_result and capture_result.get("pcap_path"):
            network_analysis = pcap_analyzer.analyze_pcap(capture_result["pcap_path"])
            result["steps"]["network"] = network_analysis
            
        # Aggregate behavior
        behavior_result = behavior_aggregator.aggregate_behaviors(
            frida_messages, network_analysis
        )
        
        result["behavior_profile"] = behavior_result
        result["risk_score"] = behavior_result["risk_score"]
        result["risk_breakdown"] = behavior_result["risk_breakdown"]
        
    except Exception as e:
        logger.error(f"Dynamic analysis failed: {e}")
        result["errors"].append(str(e))
        result["status"] = "failed"
        
    finally:
        # Emergency cleanup if things went wrong
        if frida_mgr:
            try:
                frida_mgr.detach()
            except Exception:
                pass
                
        if traffic_cap and traffic_cap.is_capturing():
            try:
                traffic_cap.stop_capture()
            except Exception:
                pass
                
        # Calculate duration
        end_time = datetime.now(timezone.utc)
        result["completed_at"] = end_time.isoformat()
        result["duration_seconds"] = (end_time - start_time).total_seconds()
        
        if result["status"] == "running":
            result["status"] = "completed" if not result["errors"] else "completed_with_errors"
            
        # Save report
        report_path = os.path.join(dynamic_dir, "dynamic_report.json")
        try:
            with open(report_path, "w") as f:
                json.dump(result, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save dynamic report: {e}")
            
    logger.info(f"Dynamic analysis complete in {result['duration_seconds']:.1f}s")
    return result

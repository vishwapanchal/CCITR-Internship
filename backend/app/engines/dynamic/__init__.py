"""
Dynamic Analysis Engine — Two-Layer Pipeline
Layer 1: Real emulator execution (ADB + Logcat + Monkey)
Layer 2: Heuristic code scan (fallback when no emulator available)

Both layers produce the same output schema so the frontend renders identically.
"""

import os
import time
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from app.engines.dynamic import vm_orchestrator
from app.engines.dynamic import heuristic_analyzer
from app.engines.dynamic import behavior_aggregator

logger = logging.getLogger(__name__)

DEFAULT_ANALYSIS_DURATION = 60


def run_full_dynamic_analysis(
    apk_path: str,
    case_dir: str,
    duration: int = DEFAULT_ANALYSIS_DURATION,
    force_emulator: bool = False
) -> Dict[str, Any]:
    """
    Execute dynamic analysis pipeline.
    Tries real emulator first (Layer 1), falls back to heuristic scan (Layer 2).
    """
    start_time = datetime.now(timezone.utc)

    result = {
        "phase": "dynamic",
        "status": "running",
        "mode": "unknown",
        "apk_path": apk_path,
        "started_at": start_time.isoformat(),
        "completed_at": None,
        "duration_seconds": None,
        "total_events": 0,
        "events": [],
        "network_activity": [],
        "risk_score": 0,
        "risk_level": "low",
        "risk_breakdown": {},
        "behaviors": {},
        "errors": [],
    }

    dynamic_dir = os.path.join(case_dir, "dynamic_analysis")
    os.makedirs(dynamic_dir, exist_ok=True)

    # ── Try Layer 1: Real Emulator ──────────────────────────────
    emulator_serial = vm_orchestrator.is_emulator_running()

    debug_log = os.path.join(dynamic_dir, "debug.log")
    with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Starting run_full_dynamic_analysis for {case_dir}\n")

    if force_emulator and not emulator_serial:
        with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Booting emulator via boot_emu.bat\n")
        logger.info("Force emulator requested, booting emulator...")
        # Boot visibly using os.startfile which acts like a user double-click, 
        # guaranteeing it spawns in the foreground Windows session!
        boot_script = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "boot_emu.bat")
        if os.path.exists(boot_script):
            os.startfile(boot_script)
        else:
            logger.error(f"Could not find boot script at {boot_script}")
            
        # Wait for it to show up in adb (it might take a while to even appear as offline)
        with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Waiting up to 60s for emulator to appear in adb...\n")
        
        for _ in range(30): # 30 * 2s = 60s
            emulator_serial = vm_orchestrator.is_emulator_running(include_offline=True)
            if emulator_serial:
                break
            time.sleep(2)
            
        with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] is_emulator_running returned: {emulator_serial}\n")
        if emulator_serial:
            logger.info(f"Emulator detected in adb: {emulator_serial}")
            with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Calling wait_for_boot\n")
            vm_orchestrator.wait_for_boot(emulator_serial, 90)
            with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Finished wait_for_boot\n")

    if emulator_serial:
        with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Proceeding to _run_emulator_analysis\n")
        logger.info(f"Emulator detected: {emulator_serial} — running real dynamic analysis")
        try:
            emulator_result = _run_emulator_analysis(
                apk_path, case_dir, dynamic_dir, emulator_serial, duration
            )
            result.update(emulator_result)
            result["mode"] = "emulator"
            result["status"] = "completed"

            _save_report(dynamic_dir, result)
            return result

        except Exception as e:
            logger.warning(f"Emulator analysis failed: {e}. Falling back to heuristic.")
            result["errors"].append(f"Emulator fallback: {e}")

    # ── Layer 2: Heuristic Code Scan ────────────────────────────
    logger.info("No emulator detected — running heuristic code scan")
    try:
        heuristic_result = heuristic_analyzer.run_heuristic_analysis(case_dir)
        result["mode"] = "heuristic"
        result["status"] = heuristic_result.get("status", "completed")
        result["events"] = heuristic_result.get("events", [])
        result["network_activity"] = heuristic_result.get("network_activity", [])
        result["total_events"] = heuristic_result.get("total_events", 0)
        result["risk_score"] = heuristic_result.get("risk_score", 0)
        result["risk_level"] = heuristic_result.get("risk_level", "low")
        result["risk_breakdown"] = heuristic_result.get("risk_breakdown", {})
        result["behaviors"] = heuristic_result.get("behaviors", {})
    except Exception as e:
        logger.error(f"Heuristic analysis also failed: {e}")
        result["errors"].append(str(e))
        result["status"] = "failed"

    end_time = datetime.now(timezone.utc)
    result["completed_at"] = end_time.isoformat()
    result["duration_seconds"] = (end_time - start_time).total_seconds()

    _save_report(dynamic_dir, result)
    return result


def _run_emulator_analysis(
    apk_path: str,
    case_dir: str,
    dynamic_dir: str,
    device_serial: str,
    duration: int
) -> Dict[str, Any]:
    """
    Run real emulator-based dynamic analysis.
    Install → Launch → Monkey → Logcat → Network → Cleanup
    """
    start_time = datetime.now(timezone.utc)
    events = []
    network_activity = []
    errors = []

    # Extract package name
    package_name = vm_orchestrator.get_package_name(apk_path)
    if not package_name:
        raise Exception("Could not determine package name from APK")

    logger.info(f"Dynamic analysis for {package_name} on {device_serial}")

    debug_log = os.path.join(dynamic_dir, "debug.log")
    with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Dynamic Step 1: Installing APK\n")
    try:
        # Step 1: Install APK
        logger.info(f"Dynamic Step 1: Installing {apk_path} on {device_serial}")
        install_result = vm_orchestrator.install_apk(apk_path, package_name, device=device_serial)
        with open(debug_log, "a") as f: f.write(f"[{datetime.now()}] Install result: {install_result}\n")
        if not install_result["success"]:
            raise Exception(f"Install failed: {install_result.get('error')}")

        # Step 2: Grant Accessibility Permissions based on Static Analysis
        import json
        static_report_path = os.path.join(case_dir, "static_analysis", "static_report.json")
        try:
            if os.path.exists(static_report_path):
                with open(static_report_path, "r") as sr_file:
                    static_data = json.load(sr_file)
                    services = static_data.get("services", [])
                    if services:
                        logger.info(f"Auto-granting Accessibility for {len(services)} services")
                        srv_list = []
                        for srv in services:
                            srv_name = srv.get("name", "")
                            if srv_name:
                                srv_list.append(f"{package_name}/{srv_name}")
                        
                        if srv_list:
                            srv_string = ":".join(srv_list)
                            vm_orchestrator._run_adb(["shell", "settings", "put", "secure", "enabled_accessibility_services", srv_string], device=device_serial)
                            vm_orchestrator._run_adb(["shell", "settings", "put", "secure", "accessibility_enabled", "1"], device=device_serial)
        except Exception as e:
            logger.error(f"Failed to auto-grant accessibility services: {e}")

        # Step 3: Clear logcat and start fresh capture
        logger.info("Dynamic Step 3: Starting logcat capture")
        vm_orchestrator.start_logcat_capture(device=device_serial)

        # Step 4: Launch the app
        logger.info("Dynamic Step 4: Launching app")
        vm_orchestrator.launch_app(package_name, device=device_serial)
        time.sleep(3)  # Let it initialize

        # Step 4: Run Monkey for random UI automation (fully automated)
        logger.info(f"Dynamic Step 4: Running Monkey ({duration}s worth of events)")
        monkey_events = max(200, int(duration * 8))
        vm_orchestrator.run_monkey(package_name, events=monkey_events, device=device_serial)

        # Step 5: Wait for behavioral data to accumulate
        logger.info(f"Dynamic Step 5: Collecting runtime data for {duration}s")
        time.sleep(max(10, duration - 30))  # Monkey already takes some time
        # Step 6: Collect logcat
        logger.info("Dynamic Step 6: Collecting logcat")
        logcat_output = vm_orchestrator.collect_logcat(device=device_serial)

        # Save raw logcat
        logcat_path = os.path.join(dynamic_dir, "logcat.txt")
        with open(logcat_path, "w", encoding="utf-8") as f:
            f.write(logcat_output)

        # Parse logcat into events
        logcat_events = vm_orchestrator.parse_logcat_events(logcat_output, package_name)
        events.extend(logcat_events)

        # Step 7: Network stats
        logger.info("Dynamic Step 7: Collecting network stats")
        net_stats = vm_orchestrator.dump_network_stats(device=device_serial)
        for conn in net_stats.get("connections", []):
            if conn.get("is_system"):
                continue # Skip system traffic like Google Play Services
            network_activity.append({
                "destination": conn.get("domain", conn["remote_ip"]),
                "ip": conn["remote_ip"],
                "port": str(conn["remote_port"]),
                "protocol": conn.get("protocol", "TCP"),
                "direction": "OUTBOUND",
                "source": "runtime_capture",
            })

    except Exception as e:
        logger.error(f"Error during emulator analysis: {e}")
        errors.append(str(e))
    # NOTE: We do NOT uninstall the app — the user may want to keep browsing

    # Also run heuristic scan to enrich with code-level findings
    try:
        heuristic_result = heuristic_analyzer.run_heuristic_analysis(case_dir)
        heuristic_events = heuristic_result.get("events", [])
        # Merge heuristic events that aren't already found in logcat
        logcat_apis = {e["api_call"] for e in events}
        for he in heuristic_events:
            if he["api_call"] not in logcat_apis:
                he["source"] = "heuristic_enrichment"
                events.append(he)
    except Exception:
        pass

    # Compute risk
    risk_data = heuristic_analyzer.compute_heuristic_risk(events)

    end_time = datetime.now(timezone.utc)

    return {
        "started_at": start_time.isoformat(),
        "completed_at": end_time.isoformat(),
        "duration_seconds": (end_time - start_time).total_seconds(),
        "package_name": package_name,
        "device": device_serial,
        "total_events": len(events),
        "events": events,
        "network_activity": network_activity,
        "risk_score": risk_data["risk_score"],
        "risk_level": risk_data["risk_level"],
        "risk_breakdown": risk_data["risk_breakdown"],
        "behaviors": risk_data["behaviors"],
        "errors": errors,
    }


def _save_report(dynamic_dir: str, result: Dict[str, Any]) -> None:
    """Save dynamic analysis report to JSON."""
    report_path = os.path.join(dynamic_dir, "dynamic_report.json")
    try:
        with open(report_path, "w") as f:
            json.dump(result, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Failed to save dynamic report: {e}")

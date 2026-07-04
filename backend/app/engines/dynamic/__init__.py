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
    duration: int = DEFAULT_ANALYSIS_DURATION
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

    if emulator_serial:
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

    try:
        # Step 1: Install APK
        logger.info("Dynamic Step 1: Installing APK")
        install_result = vm_orchestrator.install_apk(apk_path, device=device_serial)
        if not install_result["success"]:
            raise Exception(f"Install failed: {install_result.get('error')}")

        # Step 2: Clear logcat and start fresh capture
        logger.info("Dynamic Step 2: Starting logcat capture")
        vm_orchestrator.start_logcat_capture(device=device_serial)

        # Step 3: Launch the app
        logger.info("Dynamic Step 3: Launching app")
        vm_orchestrator.launch_app(package_name, device=device_serial)
        time.sleep(3)  # Let it initialize

        # Step 4: Run Monkey for random UI automation
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
            network_activity.append({
                "destination": conn["remote_ip"],
                "port": str(conn["remote_port"]),
                "protocol": conn.get("protocol", "TCP"),
                "direction": "OUTBOUND",
                "source": "runtime_capture",
            })

    except Exception as e:
        logger.error(f"Error during emulator analysis: {e}")
        errors.append(str(e))
    finally:
        # Cleanup: uninstall
        try:
            if package_name:
                vm_orchestrator.uninstall_apk(package_name, device=device_serial)
        except Exception:
            pass

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

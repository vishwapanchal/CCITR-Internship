"""
Device Monitor — Manual Penetration Testing Engine
Connects to physical Android devices via USB/ADB, monitors all activity
in real-time while the investigator manually interacts with the APK,
and detects child/dropper APK installations that hide in the background.

Integrates PCAPdroid for full packet-level network capture.
"""

import os
import re
import json
import time
import shutil
import logging
import threading
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from uuid import uuid4

from app.engines.dynamic import vm_orchestrator
from app.engines.dynamic import pcap_analyzer

logger = logging.getLogger(__name__)

# ── Active Monitoring Sessions ──────────────────────────────────────
_active_sessions: Dict[str, Dict[str, Any]] = {}

PCAPDROID_PACKAGE = "com.emanuelef.remote_capture"
PCAPDROID_APK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "tools", "PCAPdroid.apk"
)

# ── USB Device Scanning ─────────────────────────────────────────────

def scan_usb_devices() -> List[Dict[str, Any]]:
    """
    Scan for physical Android devices connected via USB.
    Filters out emulators (emulator-XXXX, 127.0.0.1:XXXX).
    """
    result = vm_orchestrator._run_adb(["devices", "-l"])
    if not result["success"]:
        return []

    devices = []
    for line in result["stdout"].strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("List of"):
            continue
        if "\tdevice" not in line:
            continue

        serial = line.split("\t")[0].strip()
        # Skip emulators
        if serial.startswith("emulator-") or serial.startswith("127.0.0.1"):
            continue

        # Get device info
        model = _get_device_prop(serial, "ro.product.model") or "Unknown"
        brand = _get_device_prop(serial, "ro.product.brand") or "Unknown"
        android_version = _get_device_prop(serial, "ro.build.version.release") or "?"
        sdk_version = _get_device_prop(serial, "ro.build.version.sdk") or "?"

        devices.append({
            "serial": serial,
            "model": model,
            "brand": brand,
            "android_version": android_version,
            "sdk_version": sdk_version,
            "display_name": f"{brand} {model} (Android {android_version})",
        })

    return devices


def _get_device_prop(serial: str, prop: str) -> Optional[str]:
    """Get a system property from the device."""
    result = vm_orchestrator._run_adb(["shell", "getprop", prop], device=serial, timeout=5)
    if result["success"]:
        return result["stdout"].strip()
    return None


# ── PCAPdroid Management ────────────────────────────────────────────

def _is_pcapdroid_installed(device: str) -> bool:
    """Check if PCAPdroid is installed on the device."""
    result = vm_orchestrator._run_adb(
        ["shell", "pm", "list", "packages", PCAPDROID_PACKAGE],
        device=device, timeout=10
    )
    return result["success"] and PCAPDROID_PACKAGE in result["stdout"]


def _install_pcapdroid(device: str) -> bool:
    """Install PCAPdroid on the device."""
    if _is_pcapdroid_installed(device):
        logger.info("PCAPdroid already installed")
        return True

    if not os.path.exists(PCAPDROID_APK_PATH):
        logger.warning(f"PCAPdroid APK not found at {PCAPDROID_APK_PATH}. "
                       "Network capture will fall back to ADB-only mode.")
        return False

    logger.info(f"Installing PCAPdroid on {device}...")
    result = vm_orchestrator._run_adb(
        ["install", "-r", "-g", PCAPDROID_APK_PATH],
        device=device, timeout=60
    )
    if result["success"]:
        logger.info("PCAPdroid installed successfully")
        return True
    else:
        logger.error(f"PCAPdroid install failed: {result.get('error')}")
        return False


def _start_pcapdroid_capture(device: str, pcap_dir: str) -> bool:
    """Start PCAPdroid packet capture via intent API."""
    # Configure PCAPdroid to save PCAP to the device's sdcard
    device_pcap_path = "/sdcard/apex_capture.pcap"

    # Start capture via broadcast intent
    result = vm_orchestrator._run_adb([
        "shell", "am", "broadcast",
        "-a", "com.emanuelef.remote_capture.START",
        "-n", f"{PCAPDROID_PACKAGE}/.CaptureCtrl",
        "--es", "pcap_dump_mode", "pcap_file",
        "--es", "pcap_name", device_pcap_path,
    ], device=device, timeout=10)

    if result["success"]:
        logger.info("PCAPdroid capture started")
        return True
    else:
        logger.warning(f"PCAPdroid start failed: {result.get('error')}")
        return False


def _stop_pcapdroid_capture(device: str, output_dir: str) -> Optional[str]:
    """Stop PCAPdroid capture and pull the PCAP file."""
    # Stop capture via broadcast intent
    vm_orchestrator._run_adb([
        "shell", "am", "broadcast",
        "-a", "com.emanuelef.remote_capture.STOP",
        "-n", f"{PCAPDROID_PACKAGE}/.CaptureCtrl",
    ], device=device, timeout=10)

    time.sleep(2)  # Let PCAPdroid flush

    # Pull the PCAP file
    device_pcap_path = "/sdcard/apex_capture.pcap"
    local_pcap_path = os.path.join(output_dir, "network_capture.pcap")

    result = vm_orchestrator._run_adb(
        ["pull", device_pcap_path, local_pcap_path],
        device=device, timeout=30
    )

    if result["success"] and os.path.exists(local_pcap_path):
        # Clean up device
        vm_orchestrator._run_adb(
            ["shell", "rm", device_pcap_path],
            device=device, timeout=5
        )
        logger.info(f"PCAP pulled to {local_pcap_path}")
        return local_pcap_path
    else:
        logger.warning("Could not pull PCAP file from device")
        return None


# ── Package Snapshot & Diff ─────────────────────────────────────────

def _snapshot_packages(device: str) -> set:
    """Take a snapshot of all installed packages on the device."""
    result = vm_orchestrator._run_adb(
        ["shell", "pm", "list", "packages", "-f"],
        device=device, timeout=15
    )
    if not result["success"]:
        return set()

    packages = set()
    for line in result["stdout"].strip().split("\n"):
        line = line.strip()
        if line.startswith("package:"):
            # Format: package:/path/to/apk=com.example.app
            match = re.search(r"=(.+)$", line)
            if match:
                packages.add(match.group(1))
    return packages


def _analyze_new_package(device: str, package_name: str) -> Dict[str, Any]:
    """Analyze a newly installed package for suspicious traits."""
    info = {
        "package_name": package_name,
        "has_launcher_icon": False,
        "is_hidden": True,
        "is_running": False,
        "permissions": [],
        "install_path": "",
        "services": [],
        "risk_level": "UNKNOWN",
    }

    # Check for launcher icon
    dump = vm_orchestrator._run_adb(
        ["shell", "pm", "dump", package_name],
        device=device, timeout=10
    )
    if dump["success"]:
        dump_text = dump["stdout"]
        info["has_launcher_icon"] = "category.LAUNCHER" in dump_text
        info["is_hidden"] = not info["has_launcher_icon"]

        # Extract permissions
        perm_section = False
        for line in dump_text.split("\n"):
            line = line.strip()
            if "requested permissions:" in line.lower():
                perm_section = True
                continue
            if perm_section and line.startswith("android.permission."):
                info["permissions"].append(line)
            elif perm_section and not line.startswith("android.permission") and line:
                perm_section = False

        # Extract services
        for line in dump_text.split("\n"):
            if "ServiceInfo{" in line:
                svc_match = re.search(r"ServiceInfo\{[^ ]+ ([^}]+)\}", line)
                if svc_match:
                    info["services"].append(svc_match.group(1))

    # Check for install path
    path_result = vm_orchestrator._run_adb(
        ["shell", "pm", "path", package_name],
        device=device, timeout=5
    )
    if path_result["success"]:
        info["install_path"] = path_result["stdout"].strip().replace("package:", "")

    # Check if running
    ps_result = vm_orchestrator._run_adb(
        ["shell", "ps", "-A"],
        device=device, timeout=5
    )
    if ps_result["success"]:
        info["is_running"] = package_name in ps_result["stdout"]

    # Determine risk level
    if info["is_hidden"] and info["is_running"]:
        info["risk_level"] = "CRITICAL"
    elif info["is_hidden"]:
        info["risk_level"] = "HIGH"
    elif info["is_running"]:
        info["risk_level"] = "MEDIUM"
    else:
        info["risk_level"] = "LOW"

    return info


def _get_package_network_connections(device: str, package_name: str) -> List[Dict[str, Any]]:
    """Get network connections for a specific package by its UID."""
    connections = []

    # Get UID for the package
    uid_result = vm_orchestrator._run_adb(
        ["shell", "dumpsys", "package", package_name],
        device=device, timeout=10
    )
    uid = None
    if uid_result["success"]:
        for line in uid_result["stdout"].split("\n"):
            if "userId=" in line:
                uid_match = re.search(r"userId=(\d+)", line)
                if uid_match:
                    uid = uid_match.group(1)
                    break

    if not uid:
        return connections

    # Check active connections from proc/net
    for proto_file in ["/proc/net/tcp", "/proc/net/tcp6"]:
        net_result = vm_orchestrator._run_adb(
            ["shell", "cat", proto_file],
            device=device, timeout=5
        )
        if net_result["success"]:
            for line in net_result["stdout"].split("\n")[1:]:  # Skip header
                parts = line.split()
                if len(parts) >= 8:
                    line_uid = parts[7] if len(parts) > 7 else ""
                    if line_uid == uid:
                        # Parse remote address
                        remote = parts[2] if len(parts) > 2 else ""
                        if ":" in remote:
                            hex_ip, hex_port = remote.split(":")
                            try:
                                ip_int = int(hex_ip, 16)
                                ip = f"{ip_int & 0xFF}.{(ip_int >> 8) & 0xFF}.{(ip_int >> 16) & 0xFF}.{(ip_int >> 24) & 0xFF}"
                                port = int(hex_port, 16)
                                if ip != "0.0.0.0" and ip != "127.0.0.1":
                                    connections.append({
                                        "destination": ip,
                                        "ip": ip,
                                        "port": str(port),
                                        "protocol": "TCP",
                                        "direction": "OUTBOUND",
                                        "source": "child_apk_network",
                                        "child_package": package_name,
                                    })
                            except ValueError:
                                pass

    return connections


# ── Logcat Monitoring Thread ────────────────────────────────────────

def _logcat_monitor_thread(session: Dict[str, Any]):
    """Background thread that continuously monitors logcat for events."""
    device = session["device_serial"]
    package_name = session.get("target_package", "")

    # Clear logcat before starting
    vm_orchestrator._run_adb(["logcat", "-c"], device=device, timeout=5)

    # Start a persistent logcat process
    adb = vm_orchestrator._find_adb()
    if not adb:
        return

    cmd = [adb, "-s", device, "logcat", "-v", "time"]
    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding="utf-8", errors="replace"
        )
        session["_logcat_proc"] = proc

        while session["status"] == "monitoring" and proc.poll() is None:
            line = proc.stdout.readline()
            if not line:
                continue

            line = line.strip()

            # Detect package installations
            if "PACKAGE_ADDED" in line or "PACKAGE_INSTALL" in line:
                pkg_match = re.search(r"package:([^\s,]+)", line)
                if pkg_match:
                    child_pkg = pkg_match.group(1)
                    if child_pkg != package_name and child_pkg != PCAPDROID_PACKAGE:
                        session["child_apks_detected"].append({
                            "package_name": child_pkg,
                            "detected_at": datetime.now(timezone.utc).isoformat(),
                            "detection_method": "logcat_broadcast",
                        })
                        session["events"].append({
                            "id": str(uuid4()),
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "api_call": f"CHILD_APK_INSTALLED: {child_pkg}",
                            "description": f"Dropper detected: parent APK silently installed child package '{child_pkg}'",
                            "category": "dropper",
                            "risk_level": "CRITICAL",
                            "class_name": "android.content.pm.PackageInstaller",
                            "source": "manual_pentest",
                        })

            # Detect suspicious API calls from target package or child packages
            watched_packages = [package_name] + [c["package_name"] for c in session["child_apks_detected"]]
            for wp in watched_packages:
                if wp and wp in line:
                    _parse_logcat_event(line, wp, session)

    except Exception as e:
        logger.error(f"Logcat monitor error: {e}")
    finally:
        if proc and proc.poll() is None:
            proc.terminate()


def _parse_logcat_event(line: str, package_name: str, session: Dict[str, Any]):
    """Parse a logcat line into a structured event if it's interesting."""
    # Network activity
    if any(kw in line.lower() for kw in ["httpurlconnection", "okhttp", "socket", "connect("]):
        session["events"].append({
            "id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "api_call": "Network Connection",
            "description": line[:200],
            "category": "network",
            "risk_level": "MEDIUM",
            "class_name": package_name,
            "source": "manual_pentest",
        })
    # SMS
    elif any(kw in line.lower() for kw in ["smsmanager", "sendtextmessage", "sms_received"]):
        session["events"].append({
            "id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "api_call": "SMS Activity",
            "description": line[:200],
            "category": "sms",
            "risk_level": "CRITICAL",
            "class_name": package_name,
            "source": "manual_pentest",
        })
    # Accessibility / overlay
    elif any(kw in line.lower() for kw in ["accessibilityservice", "overlay", "draw_over"]):
        session["events"].append({
            "id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "api_call": "Accessibility/Overlay Abuse",
            "description": line[:200],
            "category": "data_exfil",
            "risk_level": "CRITICAL",
            "class_name": package_name,
            "source": "manual_pentest",
        })
    # Crypto / encryption
    elif any(kw in line.lower() for kw in ["cipher", "secretkey", "aes", "encrypt", "decrypt"]):
        session["events"].append({
            "id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "api_call": "Cryptographic Operation",
            "description": line[:200],
            "category": "crypto",
            "risk_level": "MEDIUM",
            "class_name": package_name,
            "source": "manual_pentest",
        })
    # Location / GPS
    elif any(kw in line.lower() for kw in ["locationmanager", "getlastknownlocation", "gps"]):
        session["events"].append({
            "id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "api_call": "Location Access",
            "description": line[:200],
            "category": "surveillance",
            "risk_level": "HIGH",
            "class_name": package_name,
            "source": "manual_pentest",
        })


# ── Network Polling Thread ──────────────────────────────────────────

def _network_poll_thread(session: Dict[str, Any]):
    """Background thread that polls network connections periodically."""
    device = session["device_serial"]
    seen_connections = set()

    while session["status"] == "monitoring":
        try:
            net_stats = vm_orchestrator.dump_network_stats(device=device)
            for conn in net_stats.get("connections", []):
                if conn.get("is_system"):
                    continue
                key = f"{conn['remote_ip']}:{conn['remote_port']}"
                if key not in seen_connections:
                    seen_connections.add(key)
                    session["network_activity"].append({
                        "destination": conn.get("domain", conn["remote_ip"]),
                        "ip": conn["remote_ip"],
                        "port": str(conn["remote_port"]),
                        "protocol": conn.get("protocol", "TCP"),
                        "direction": "OUTBOUND",
                        "source": "manual_pentest_runtime",
                    })
        except Exception as e:
            logger.debug(f"Network poll error: {e}")

        time.sleep(5)  # Poll every 5 seconds


# ── Session Management ──────────────────────────────────────────────

def start_monitoring_session(
    device_serial: str,
    case_dir: str,
    case_id: str,
    apk_path: str = "",
) -> Dict[str, Any]:
    """
    Start a real-time monitoring session on a physical device.
    Returns session info for the frontend to track.
    """
    session_id = str(uuid4())
    pentest_dir = os.path.join(case_dir, "pentest_analysis")
    os.makedirs(pentest_dir, exist_ok=True)

    # Get package name from APK if available
    target_package = ""
    if apk_path and os.path.exists(apk_path):
        target_package = vm_orchestrator.get_package_name(apk_path) or ""

    # Step 1: Snapshot packages before
    logger.info(f"[Pentest] Taking package snapshot BEFORE on {device_serial}")
    packages_before = _snapshot_packages(device_serial)

    # Record the device's own IP so captured packets can be classified
    # inbound/outbound once the PCAP is parsed.
    device_ip = vm_orchestrator.get_device_ip(device_serial)
    if device_ip:
        logger.info(f"[Pentest] Device IP for direction classification: {device_ip}")
    else:
        logger.warning("[Pentest] Could not determine device IP — PCAP traffic direction will be UNKNOWN")

    # Step 2: Install PCAPdroid for network capture
    pcapdroid_available = _install_pcapdroid(device_serial)

    # Step 3: Start PCAPdroid capture
    pcap_active = False
    if pcapdroid_available:
        pcap_active = _start_pcapdroid_capture(device_serial, pentest_dir)

    # Build session state
    session = {
        "session_id": session_id,
        "case_id": case_id,
        "case_dir": case_dir,
        "pentest_dir": pentest_dir,
        "device_serial": device_serial,
        "target_package": target_package,
        "apk_path": apk_path,
        "status": "monitoring",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "device_ip": device_ip,
        "packages_before": packages_before,
        "child_apks_detected": [],
        "events": [],
        "network_activity": [],
        "pcap_active": pcap_active,
        "pcapdroid_installed": pcapdroid_available,
        "_logcat_proc": None,
    }

    _active_sessions[session_id] = session

    # Step 4: Start background monitoring threads
    logcat_thread = threading.Thread(
        target=_logcat_monitor_thread, args=(session,), daemon=True
    )
    logcat_thread.start()

    net_thread = threading.Thread(
        target=_network_poll_thread, args=(session,), daemon=True
    )
    net_thread.start()

    session["_logcat_thread"] = logcat_thread
    session["_net_thread"] = net_thread

    logger.info(f"[Pentest] Monitoring session {session_id} started on {device_serial}")

    return {
        "session_id": session_id,
        "device_serial": device_serial,
        "target_package": target_package,
        "pcapdroid_active": pcap_active,
        "status": "monitoring",
        "started_at": session["started_at"],
    }


def get_session_status(session_id: str) -> Dict[str, Any]:
    """Get live stats from an active monitoring session."""
    session = _active_sessions.get(session_id)
    if not session:
        return {"error": "Session not found", "status": "not_found"}

    elapsed = 0
    if session.get("started_at"):
        start = datetime.fromisoformat(session["started_at"])
        elapsed = (datetime.now(timezone.utc) - start).total_seconds()

    return {
        "session_id": session_id,
        "status": session["status"],
        "elapsed_seconds": round(elapsed),
        "events_captured": len(session["events"]),
        "network_connections": len(session["network_activity"]),
        "child_apks_detected": len(session["child_apks_detected"]),
        "child_apk_details": session["child_apks_detected"],
        "pcapdroid_active": session.get("pcap_active", False),
        "device_serial": session["device_serial"],
    }


def stop_monitoring_session(session_id: str) -> Dict[str, Any]:
    """
    Stop a monitoring session and produce the final analysis report.
    Diffs packages, analyzes child APKs, pulls PCAP, enriches with VT.
    """
    session = _active_sessions.get(session_id)
    if not session:
        return {"error": "Session not found", "status": "failed"}

    session["status"] = "finalizing"
    device = session["device_serial"]
    pentest_dir = session["pentest_dir"]
    case_dir = session["case_dir"]

    logger.info(f"[Pentest] Stopping session {session_id}")

    # Step 1: Kill logcat process
    logcat_proc = session.get("_logcat_proc")
    if logcat_proc and logcat_proc.poll() is None:
        logcat_proc.terminate()
        try:
            logcat_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            logcat_proc.kill()

    # Step 2: Stop PCAPdroid, pull the PCAP, and parse it for byte/packet/
    # direction statistics and suspicious-traffic indicators.
    pcap_path = None
    pcap_stats = None
    if session.get("pcap_active"):
        pcap_path = _stop_pcapdroid_capture(device, pentest_dir)
        if pcap_path:
            pcap_stats = pcap_analyzer.analyze_pcap(pcap_path, device_ip=session.get("device_ip"))
            if pcap_stats.get("status") == "success":
                logger.info(
                    f"[Pentest] PCAP analysis: {pcap_stats['total_packets']} packets, "
                    f"{pcap_stats['total_bytes']} bytes, "
                    f"{len(pcap_stats['suspicious_indicators'])} suspicious indicators"
                )
                for indicator in pcap_stats["suspicious_indicators"]:
                    event_category = "data_exfil" if indicator["type"] == "exfiltration_pattern" else "network"
                    session["events"].append({
                        "id": str(uuid4()),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "api_call": f"NETWORK_INDICATOR: {indicator['type']}",
                        "description": indicator["description"],
                        "category": event_category,
                        "risk_level": indicator["severity"].upper(),
                        "class_name": "PCAPAnalyzer",
                        "source": "pcap_analysis",
                    })
            else:
                logger.warning(f"[Pentest] PCAP analysis failed: {pcap_stats.get('error')}")

    # Step 3: Package diff — detect child APKs
    logger.info("[Pentest] Taking package snapshot AFTER")
    packages_after = _snapshot_packages(device)
    new_packages = packages_after - session["packages_before"]

    # Remove PCAPdroid from the diff (we installed it)
    new_packages.discard(PCAPDROID_PACKAGE)

    # Also remove the target package itself
    if session["target_package"]:
        new_packages.discard(session["target_package"])

    logger.info(f"[Pentest] {len(new_packages)} new packages detected: {new_packages}")

    # Step 4: Analyze each child APK
    child_apk_reports = []
    child_network = []
    for pkg in new_packages:
        logger.info(f"[Pentest] Analyzing child APK: {pkg}")
        pkg_info = _analyze_new_package(device, pkg)
        child_apk_reports.append(pkg_info)

        # Get network connections for the child
        pkg_net = _get_package_network_connections(device, pkg)
        child_network.extend(pkg_net)

        # Add as event if not already detected via logcat
        already_detected = any(
            c["package_name"] == pkg for c in session["child_apks_detected"]
        )
        if not already_detected:
            session["events"].append({
                "id": str(uuid4()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "api_call": f"CHILD_APK_DETECTED: {pkg}",
                "description": f"Package diff detected new {'HIDDEN' if pkg_info['is_hidden'] else ''} child APK: {pkg}" +
                               (f" — RUNNING in background!" if pkg_info["is_running"] else ""),
                "category": "dropper",
                "risk_level": "CRITICAL" if pkg_info["is_hidden"] else "HIGH",
                "class_name": "android.content.pm.PackageInstaller",
                "source": "manual_pentest",
            })

    # Add child network to session
    session["network_activity"].extend(child_network)

    # Step 5: Pull child APKs from device for static analysis
    pulled_child_apks = []
    for report in child_apk_reports:
        if report["install_path"]:
            local_path = os.path.join(pentest_dir, f"child_{report['package_name']}.apk")
            pull_result = vm_orchestrator._run_adb(
                ["pull", report["install_path"], local_path],
                device=device, timeout=30
            )
            if pull_result["success"] and os.path.exists(local_path):
                pulled_child_apks.append({
                    "package_name": report["package_name"],
                    "local_path": local_path,
                })
                logger.info(f"[Pentest] Pulled child APK: {report['package_name']}")

    # Step 6: Run static analysis on child APKs
    child_static_results = []
    for child in pulled_child_apks:
        try:
            from app.engines.static import run_full_static_analysis
            child_case_dir = os.path.join(pentest_dir, f"child_{child['package_name']}")
            os.makedirs(child_case_dir, exist_ok=True)
            # Copy APK into child case dir
            child_apk_dest = os.path.join(child_case_dir, f"{child['package_name']}.apk")
            shutil.copy2(child["local_path"], child_apk_dest)

            logger.info(f"[Pentest] Running static analysis on child: {child['package_name']}")
            child_result = run_full_static_analysis(child_apk_dest, child_case_dir)
            child_static_results.append({
                "package_name": child["package_name"],
                "result": child_result,
            })
        except Exception as e:
            logger.error(f"[Pentest] Static analysis of child {child['package_name']} failed: {e}")

    # Step 7: VirusTotal enrichment (same as emulator path)
    try:
        from app.engines import virustotal_client
        if virustotal_client._has_key():
            # Enrich main APK
            if session["apk_path"] and os.path.exists(session["apk_path"]):
                file_hash = virustotal_client.sha256_of_file(session["apk_path"])
                behaviours = virustotal_client.get_behaviours(file_hash)
                if behaviours:
                    deep_events = virustotal_client.extract_sandbox_events(behaviours)
                    existing_apis = {e["api_call"] for e in session["events"]}
                    for de in deep_events:
                        if de["api_call"] not in existing_apis:
                            session["events"].append(de)
                            existing_apis.add(de["api_call"])

                    deep_network = virustotal_client.extract_network_from_behaviours(behaviours)
                    existing_dests = {n["destination"] for n in session["network_activity"]}
                    for dn in deep_network:
                        if dn["destination"] not in existing_dests:
                            session["network_activity"].append(dn)
                            existing_dests.add(dn["destination"])
    except Exception as e:
        logger.debug(f"[Pentest] VT enrichment skipped: {e}")

    # Step 8: Compute risk score
    from app.engines.dynamic.heuristic_analyzer import compute_heuristic_risk
    risk_data = compute_heuristic_risk(session["events"])

    # Boost risk if hidden child APKs found
    child_risk_boost = sum(
        30 if r["risk_level"] == "CRITICAL" else 15 if r["risk_level"] == "HIGH" else 5
        for r in child_apk_reports
    )
    # Boost risk for suspicious network indicators found in the PCAP (beaconing, exfiltration, etc.)
    network_risk_boost = 0
    if pcap_stats and pcap_stats.get("status") == "success":
        network_risk_boost = sum(
            20 if i["severity"] == "critical" else 10 if i["severity"] == "high" else 3
            for i in pcap_stats["suspicious_indicators"]
        )
    final_risk = min(risk_data["risk_score"] + child_risk_boost + network_risk_boost, 100)

    end_time = datetime.now(timezone.utc)

    # Build final result (same schema as emulator dynamic result)
    result = {
        "phase": "dynamic",
        "status": "completed",
        "mode": "manual_pentest",
        "apk_path": session["apk_path"],
        "started_at": session["started_at"],
        "completed_at": end_time.isoformat(),
        "duration_seconds": (end_time - datetime.fromisoformat(session["started_at"])).total_seconds(),
        "device": device,
        "total_events": len(session["events"]),
        "events": session["events"],
        "network_activity": session["network_activity"],
        "risk_score": final_risk,
        "risk_level": "critical" if final_risk >= 75 else "high" if final_risk >= 50 else "medium" if final_risk >= 25 else "low",
        "risk_breakdown": risk_data["risk_breakdown"],
        "behaviors": risk_data["behaviors"],
        "errors": [],
        # Manual pentest specific fields
        "pentest_data": {
            "child_apks": child_apk_reports,
            "child_apk_count": len(child_apk_reports),
            "hidden_child_apks": [r for r in child_apk_reports if r["is_hidden"]],
            "running_child_apks": [r for r in child_apk_reports if r["is_running"]],
            "child_static_analysis": child_static_results,
            "pcap_file": pcap_path,
            "pcapdroid_used": session.get("pcap_active", False),
            "packages_before_count": len(session["packages_before"]),
            "packages_after_count": len(packages_after),
            "device_ip": session.get("device_ip"),
            "network_stats": pcap_stats,
        },
    }

    # Save report — both a pentest-specific copy and the standard
    # dynamic_analysis/dynamic_report.json location that the report
    # generator and threat-reasoning agent read for every dynamic result.
    report_path = os.path.join(pentest_dir, "pentest_report.json")
    try:
        with open(report_path, "w") as f:
            json.dump(result, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"[Pentest] Failed to save report: {e}")

    dynamic_dir = os.path.join(case_dir, "dynamic_analysis")
    os.makedirs(dynamic_dir, exist_ok=True)
    try:
        with open(os.path.join(dynamic_dir, "dynamic_report.json"), "w") as f:
            json.dump(result, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"[Pentest] Failed to save standard dynamic report: {e}")

    # Clean up session
    session["status"] = "completed"
    session["result"] = result

    logger.info(
        f"[Pentest] Session {session_id} complete — "
        f"Risk: {final_risk}, Events: {len(session['events'])}, "
        f"Child APKs: {len(child_apk_reports)}, "
        f"Hidden: {len([r for r in child_apk_reports if r['is_hidden']])}"
    )

    return result


def get_active_session_for_case(case_id: str) -> Optional[str]:
    """Check if there's an active monitoring session for a case."""
    for sid, session in _active_sessions.items():
        if session.get("case_id") == case_id and session.get("status") == "monitoring":
            return sid
    return None

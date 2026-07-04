"""
VM Orchestrator — ADB-Based Android Emulator Management (Simplified)
Manages the lifecycle of Android emulators for dynamic APK analysis:
install, launch, monkey, logcat capture, network dump, uninstall.
"""

import os
import subprocess
import time
import re
import logging
import shutil
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Timeouts (seconds)
ADB_COMMAND_TIMEOUT = 30
INSTALL_TIMEOUT = 60
MONKEY_TIMEOUT = 120
LOGCAT_PARSE_MAX = 5000

# ADB path
ADB_PATH = None


def _find_adb() -> Optional[str]:
    """Find adb binary on the system."""
    global ADB_PATH
    if ADB_PATH:
        return ADB_PATH

    result = shutil.which("adb")
    if result:
        ADB_PATH = result
        return result

    sdk_paths = [
        os.path.expanduser("~/AppData/Local/Android/Sdk/platform-tools/adb.exe"),
        os.path.expanduser("~/Android/Sdk/platform-tools/adb"),
        os.path.expanduser("~/Library/Android/sdk/platform-tools/adb"),
    ]
    for path in sdk_paths:
        if os.path.isfile(path):
            ADB_PATH = path
            return path
    return None


def _run_adb(args: List[str], device: Optional[str] = None, timeout: int = ADB_COMMAND_TIMEOUT) -> Dict[str, Any]:
    """Run an ADB command and return structured result."""
    adb = _find_adb()
    if not adb:
        return {"success": False, "error": "ADB not found", "stdout": "", "stderr": ""}

    cmd = [adb]
    if device:
        cmd.extend(["-s", device])
    cmd.extend(args)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "error": result.stderr if result.returncode != 0 else None,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"ADB timed out after {timeout}s", "stdout": "", "stderr": ""}
    except FileNotFoundError:
        return {"success": False, "error": "ADB binary not found", "stdout": "", "stderr": ""}


def is_emulator_running() -> Optional[str]:
    """Check if an emulator is running. Returns device serial or None."""
    result = _run_adb(["devices"])
    if not result["success"]:
        return None

    for line in result["stdout"].strip().split("\n"):
        line = line.strip()
        if "\tdevice" in line:
            serial = line.split("\t")[0]
            # Emulators are typically emulator-5554, emulator-5556, etc.
            if serial.startswith("emulator-") or serial.startswith("127.0.0.1"):
                return serial

    return None


def wait_for_boot(device: str, timeout: int = 90) -> bool:
    """Wait for the device to finish booting."""
    start = time.time()
    while time.time() - start < timeout:
        result = _run_adb(["shell", "getprop", "sys.boot_completed"], device=device)
        if result["success"] and result["stdout"].strip() == "1":
            logger.info(f"Device {device} booted successfully")
            return True
        time.sleep(3)
    logger.error(f"Device {device} did not boot within {timeout}s")
    return False


def get_package_name(apk_path: str) -> Optional[str]:
    """Extract package name from an APK using aapt2 or aapt."""
    adb = _find_adb()
    if not adb:
        return None

    # Try aapt2 first (in build-tools)
    sdk_root = os.path.dirname(os.path.dirname(adb))
    build_tools = os.path.join(sdk_root, "build-tools")

    aapt_bin = None
    if os.path.isdir(build_tools):
        for ver_dir in sorted(os.listdir(build_tools), reverse=True):
            candidate = os.path.join(build_tools, ver_dir, "aapt2.exe")
            if not os.path.isfile(candidate):
                candidate = os.path.join(build_tools, ver_dir, "aapt2")
            if os.path.isfile(candidate):
                aapt_bin = candidate
                break

    if aapt_bin:
        try:
            result = subprocess.run(
                [aapt_bin, "dump", "packagename", apk_path],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception:
            pass

    # Fallback: try androguard
    try:
        from androguard.core.apk import APK
        apk = APK(apk_path)
        return apk.get_package()
    except Exception:
        pass

    return None


def install_apk(apk_path: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Install APK on device."""
    logger.info(f"Installing APK: {apk_path}")
    result = _run_adb(["install", "-r", "-t", apk_path], device=device, timeout=INSTALL_TIMEOUT)
    if result["success"]:
        logger.info("APK installed successfully")
    else:
        logger.error(f"APK install failed: {result['error']}")
    return result


def uninstall_apk(package_name: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Uninstall an APK by package name."""
    logger.info(f"Uninstalling: {package_name}")
    return _run_adb(["uninstall", package_name], device=device)


def launch_app(package_name: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Launch an app's main activity."""
    # First try to find the launcher activity
    result = _run_adb(
        ["shell", "cmd", "package", "resolve-activity", "--brief", package_name],
        device=device
    )

    activity = None
    if result["success"]:
        for line in result["stdout"].strip().split("\n"):
            if "/" in line and package_name in line:
                activity = line.strip()
                break

    if activity:
        return _run_adb(["shell", "am", "start", "-n", activity], device=device)
    else:
        # Fallback: monkey launch
        return _run_adb(
            ["shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"],
            device=device
        )


def run_monkey(package_name: str, events: int = 500, device: Optional[str] = None) -> Dict[str, Any]:
    """Run Android Monkey for random UI interactions."""
    logger.info(f"Running Monkey: {events} events on {package_name}")
    return _run_adb(
        ["shell", "monkey", "-p", package_name, "--throttle", "300",
         "--ignore-crashes", "--ignore-timeouts", "--ignore-security-exceptions",
         "-v", str(events)],
        device=device,
        timeout=MONKEY_TIMEOUT
    )


def capture_logcat(device: Optional[str] = None, duration: int = 5) -> str:
    """Capture logcat output. Clear first, then capture for duration."""
    # Clear existing logcat
    _run_adb(["logcat", "-c"], device=device)

    time.sleep(duration)

    # Dump logcat
    result = _run_adb(["logcat", "-d", "-v", "time"], device=device, timeout=30)
    if result["success"]:
        return result["stdout"]
    return ""


def start_logcat_capture(device: Optional[str] = None) -> None:
    """Clear logcat buffer to start fresh capture."""
    _run_adb(["logcat", "-c"], device=device)


def collect_logcat(device: Optional[str] = None) -> str:
    """Collect all logcat since last clear."""
    result = _run_adb(["logcat", "-d", "-v", "threadtime"], device=device, timeout=30)
    return result["stdout"] if result["success"] else ""


def dump_network_stats(device: Optional[str] = None) -> Dict[str, Any]:
    """Get network statistics from device."""
    stats: Dict[str, Any] = {"connections": [], "dns_queries": []}

    # Get active connections
    result = _run_adb(["shell", "cat", "/proc/net/tcp"], device=device)
    if result["success"]:
        for line in result["stdout"].strip().split("\n")[1:]:  # skip header
            parts = line.split()
            if len(parts) >= 4:
                # Parse hex IP:port
                try:
                    remote = parts[2]
                    hex_ip, hex_port = remote.split(":")
                    port = int(hex_port, 16)
                    # Convert hex IP to dotted
                    ip_int = int(hex_ip, 16)
                    ip = f"{ip_int & 0xFF}.{(ip_int >> 8) & 0xFF}.{(ip_int >> 16) & 0xFF}.{(ip_int >> 24) & 0xFF}"
                    if ip != "0.0.0.0" and port != 0:
                        stats["connections"].append({
                            "remote_ip": ip,
                            "remote_port": port,
                            "protocol": "TCP",
                        })
                except Exception:
                    continue

    # Get dumpsys connectivity info
    result = _run_adb(["shell", "dumpsys", "connectivity"], device=device)
    if result["success"]:
        stats["connectivity_dump"] = result["stdout"][:2000]  # Cap size

    return stats


def parse_logcat_events(logcat_output: str, package_name: str) -> List[Dict[str, Any]]:
    """
    Parse logcat output into structured behavioral events.
    Looks for API calls, network activity, exceptions, intents.
    """
    events: List[Dict[str, Any]] = []
    event_id = 0
    seen: set = set()

    # Patterns to detect in logcat
    patterns = [
        # Network
        (r"(https?://[^\s\"']+)", "network", "HTTP Request", "MEDIUM"),
        (r"Connecting to\s+([\w\.\-]+)", "network", "Connection Attempt", "MEDIUM"),
        (r"dns_query.*?(\S+\.\S+)", "network", "DNS Query", "MEDIUM"),

        # Security exceptions
        (r"SecurityException:\s*(.+)", "security", "Security Exception", "HIGH"),
        (r"Permission denied.*?(\S+)", "security", "Permission Denied", "MEDIUM"),

        # Crypto
        (r"Cipher.*?(AES|DES|RSA|CBC|GCM)", "crypto", "Cipher Operation", "MEDIUM"),

        # File I/O
        (r"(\/sdcard\/[^\s]+|\/storage\/[^\s]+)", "file_io", "File Access", "MEDIUM"),
        (r"SharedPreferences.*?(put|get|edit)", "file_io", "SharedPreferences Access", "LOW"),

        # Dynamic loading
        (r"DexClassLoader|InMemoryDexClassLoader", "dynamic_loading", "Dynamic Code Loading", "CRITICAL"),
        (r"dlopen\((.+?)\)", "dynamic_loading", "Native Library Load", "HIGH"),

        # SMS
        (r"SmsManager|sendTextMessage", "sms", "SMS Operation", "CRITICAL"),

        # Device info
        (r"getDeviceId|getImei|getSubscriberId", "data_exfil", "Device ID Access", "HIGH"),
    ]

    lines = logcat_output.split("\n")
    for line in lines[:LOGCAT_PARSE_MAX]:
        # Only look at lines from our package or system events
        if package_name not in line and "AndroidRuntime" not in line:
            continue

        for pattern, category, title, risk in patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                detail = match.group(1) if match.lastindex else match.group(0)
                dedup = (category, title, detail[:50])
                if dedup in seen:
                    continue
                seen.add(dedup)

                # Extract timestamp from logcat line
                ts_match = re.match(r"(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)", line)
                timestamp = ts_match.group(1) if ts_match else datetime.now(timezone.utc).isoformat()

                event_id += 1
                events.append({
                    "id": f"logcat-{event_id}",
                    "timestamp": str(timestamp),
                    "category": category,
                    "api_call": title,
                    "class_name": package_name,
                    "risk_level": risk,
                    "description": detail[:200],
                    "source": "logcat_runtime",
                    "raw_line": line[:300],
                })

    # Also look for crashes/ANRs
    crash_pattern = re.compile(
        rf"FATAL EXCEPTION.*?{re.escape(package_name)}.*?$\n(.*?)$",
        re.MULTILINE
    )
    for match in crash_pattern.finditer(logcat_output):
        event_id += 1
        events.append({
            "id": f"logcat-{event_id}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "category": "crash",
            "api_call": "FATAL EXCEPTION",
            "class_name": package_name,
            "risk_level": "HIGH",
            "description": match.group(0)[:300],
            "source": "logcat_runtime",
        })

    return events

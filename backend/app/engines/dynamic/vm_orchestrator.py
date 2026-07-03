"""
VM Orchestrator — ADB-Based Android Emulator/Device Management
Manages the lifecycle of Android emulators/devices for dynamic APK analysis:
start, install, launch, interact, capture, and stop.
"""

import os
import subprocess
import time
import logging
import shutil
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Timeouts (seconds)
EMULATOR_BOOT_TIMEOUT = 120
ADB_COMMAND_TIMEOUT = 30
INSTALL_TIMEOUT = 60
MONKEY_TIMEOUT = 120


def _find_adb() -> Optional[str]:
    """Find adb binary on the system."""
    result = shutil.which("adb")
    if result:
        return result
    # Check common Android SDK locations including Windows
    sdk_paths = [
        os.path.expanduser("~/AppData/Local/Android/Sdk/platform-tools/adb.exe"),
        os.path.expanduser("~/Android/Sdk/platform-tools/adb"),
        os.path.expanduser("~/Library/Android/sdk/platform-tools/adb"),
        "/usr/local/android-sdk/platform-tools/adb",
        "/opt/android-sdk/platform-tools/adb",
    ]
    for path in sdk_paths:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return None


def _find_emulator() -> Optional[str]:
    """Find Android emulator binary."""
    result = shutil.which("emulator")
    if result:
        return result
    sdk_paths = [
        os.path.expanduser("~/AppData/Local/Android/Sdk/emulator/emulator.exe"),
        os.path.expanduser("~/Android/Sdk/emulator/emulator"),
        os.path.expanduser("~/Library/Android/sdk/emulator/emulator"),
        "/usr/local/android-sdk/emulator/emulator",
    ]
    for path in sdk_paths:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return None


def _run_adb(args: List[str], device: Optional[str] = None, timeout: int = ADB_COMMAND_TIMEOUT) -> Dict[str, Any]:
    """
    Run an ADB command and return structured result.
    """
    adb = _find_adb()
    if not adb:
        return {"success": False, "error": "adb binary not found", "stdout": "", "stderr": ""}

    cmd = [adb]
    if device:
        cmd.extend(["-s", device])
    cmd.extend(args)

    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout
        )
        return {
            "success": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
            "command": " ".join(cmd),
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Command timed out after {timeout}s", "stdout": "", "stderr": ""}
    except Exception as e:
        return {"success": False, "error": str(e), "stdout": "", "stderr": ""}


def list_devices() -> List[Dict[str, str]]:
    """List all connected ADB devices/emulators."""
    result = _run_adb(["devices", "-l"])
    devices = []

    if not result["success"]:
        return devices

    for line in result["stdout"].split("\n")[1:]:  # Skip header
        line = line.strip()
        if not line or "offline" in line:
            continue

        parts = line.split()
        if len(parts) >= 2:
            device = {"serial": parts[0], "state": parts[1]}
            # Parse extra info
            for part in parts[2:]:
                if ":" in part:
                    key, val = part.split(":", 1)
                    device[key] = val
            devices.append(device)

    return devices


def start_emulator(avd_name: str = "apex_x_sandbox", port: int = 5554) -> Dict[str, Any]:
    """
    Start an Android emulator with the specified AVD.

    Args:
        avd_name: Name of the Android Virtual Device to launch.
        port: Console port for the emulator.

    Returns:
        Dict with status, emulator serial, and any errors.
    """
    emulator_bin = _find_emulator()
    if not emulator_bin:
        return {"success": False, "error": "emulator binary not found", "serial": None}

    serial = f"emulator-{port}"

    # Check if already running
    devices = list_devices()
    for d in devices:
        if d["serial"] == serial and d["state"] == "device":
            logger.info(f"Emulator {serial} already running.")
            return {"success": True, "serial": serial, "already_running": True}

    # Launch emulator in background
    cmd = [
        emulator_bin, "-avd", avd_name,
        "-port", str(port),
        "-no-window",           # Headless for server environments
        "-no-audio",
        "-no-boot-anim",
        "-gpu", "swiftshader_indirect",
        "-writable-system",     # Allow filesystem modifications
    ]

    logger.info(f"Starting emulator: {' '.join(cmd)}")

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except Exception as e:
        return {"success": False, "error": f"Failed to start emulator: {e}", "serial": None}

    # Wait for device to become ready
    success = wait_for_device(serial, timeout=EMULATOR_BOOT_TIMEOUT)

    if success:
        logger.info(f"Emulator {serial} is ready.")
        return {"success": True, "serial": serial, "pid": proc.pid}
    else:
        logger.error(f"Emulator {serial} failed to boot within {EMULATOR_BOOT_TIMEOUT}s.")
        try:
            proc.terminate()
        except Exception:
            pass
        return {"success": False, "error": "Emulator boot timeout", "serial": serial}


def wait_for_device(serial: str, timeout: int = EMULATOR_BOOT_TIMEOUT) -> bool:
    """Wait for an ADB device to be fully booted and ready."""
    start = time.time()

    while time.time() - start < timeout:
        # Check device state
        result = _run_adb(["get-state"], device=serial, timeout=5)
        if result["success"] and result["stdout"] == "device":
            # Verify boot completed
            boot_result = _run_adb(
                ["shell", "getprop", "sys.boot_completed"],
                device=serial, timeout=5
            )
            if boot_result["success"] and boot_result["stdout"].strip() == "1":
                return True

        time.sleep(3)

    return False


def install_apk(apk_path: str, device: Optional[str] = None) -> Dict[str, Any]:
    """
    Install an APK on the device/emulator.

    Args:
        apk_path: Path to the APK file.
        device: Optional device serial. Uses default if None.

    Returns:
        Dict with installation result.
    """
    if not os.path.exists(apk_path):
        return {"success": False, "error": f"APK not found: {apk_path}"}

    result = _run_adb(["install", "-r", "-g", apk_path], device=device, timeout=INSTALL_TIMEOUT)

    if result["success"] and "Success" in result["stdout"]:
        logger.info(f"APK installed successfully on {device or 'default device'}")
        return {"success": True, "output": result["stdout"]}
    else:
        error = result.get("stderr", result.get("error", "Unknown error"))
        logger.error(f"APK installation failed: {error}")
        return {"success": False, "error": error, "output": result.get("stdout", "")}


def get_package_name(apk_path: str) -> Optional[str]:
    """Extract package name from APK using aapt or aapt2."""
    for tool in ["aapt2", "aapt"]:
        bin_path = shutil.which(tool)
        if not bin_path:
            continue
        try:
            proc = subprocess.run(
                [bin_path, "dump", "badging", apk_path],
                capture_output=True, text=True, timeout=15
            )
            for line in proc.stdout.split("\n"):
                if line.startswith("package:"):
                    # Parse: package: name='com.example.app' ...
                    for part in line.split(" "):
                        if part.startswith("name='"):
                            return part.split("'")[1]
        except Exception:
            continue

    return None


def launch_app(package_name: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Launch an installed app by its package name."""
    result = _run_adb(
        ["shell", "monkey", "-p", package_name, "-c",
         "android.intent.category.LAUNCHER", "1"],
        device=device
    )

    if result["success"]:
        logger.info(f"Launched app: {package_name}")
        return {"success": True}
    else:
        return {"success": False, "error": result.get("stderr", result.get("error", ""))}


def run_monkey(
    package_name: str,
    events: int = 500,
    device: Optional[str] = None,
    throttle_ms: int = 300,
) -> Dict[str, Any]:
    """
    Run Android Monkey tool for automated UI interaction / stress testing.

    Args:
        package_name: Target app package name.
        events: Number of random events to generate.
        device: Device serial.
        throttle_ms: Delay between events in milliseconds.
    """
    result = _run_adb(
        ["shell", "monkey", "-p", package_name,
         "--throttle", str(throttle_ms),
         "-v", str(events)],
        device=device,
        timeout=MONKEY_TIMEOUT,
    )

    return {
        "success": result["success"],
        "events_sent": events,
        "output": result["stdout"][:2000] if result["stdout"] else "",
        "error": result.get("error", result.get("stderr", ""))[:500],
    }


def shell(command: str, device: Optional[str] = None, timeout: int = ADB_COMMAND_TIMEOUT) -> Dict[str, Any]:
    """Execute a shell command on the device."""
    return _run_adb(["shell"] + command.split(), device=device, timeout=timeout)


def pull_file(remote_path: str, local_path: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Pull a file from the device to the host."""
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    return _run_adb(["pull", remote_path, local_path], device=device, timeout=60)


def push_file(local_path: str, remote_path: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Push a file from the host to the device."""
    return _run_adb(["push", local_path, remote_path], device=device, timeout=60)


def uninstall_apk(package_name: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Uninstall an app from the device."""
    return _run_adb(["uninstall", package_name], device=device)


def stop_emulator(device: Optional[str] = None) -> Dict[str, Any]:
    """Stop the emulator by sending emu kill."""
    result = _run_adb(["emu", "kill"], device=device)
    if result["success"]:
        logger.info("Emulator stopped successfully.")
    return result


def take_screenshot(output_path: str, device: Optional[str] = None) -> Dict[str, Any]:
    """Capture a screenshot from the device."""
    remote_path = "/sdcard/screenshot.png"
    shell("screencap -p " + remote_path, device=device)
    return pull_file(remote_path, output_path, device=device)


def get_device_info(device: Optional[str] = None) -> Dict[str, Any]:
    """Get device properties for forensic metadata."""
    props = {}
    prop_keys = [
        "ro.build.version.release",
        "ro.build.version.sdk",
        "ro.product.model",
        "ro.product.manufacturer",
        "ro.product.name",
        "ro.build.fingerprint",
        "ro.hardware",
    ]

    for key in prop_keys:
        result = _run_adb(["shell", "getprop", key], device=device, timeout=5)
        if result["success"]:
            short_key = key.split(".")[-1]
            props[short_key] = result["stdout"]

    return props


def get_running_processes(device: Optional[str] = None) -> List[str]:
    """Get list of running processes on the device."""
    result = _run_adb(["shell", "ps", "-A"], device=device)
    if result["success"]:
        return result["stdout"].split("\n")
    return []


def list_installed_packages(device: Optional[str] = None) -> List[str]:
    """List all installed packages on the device."""
    result = _run_adb(["shell", "pm", "list", "packages"], device=device)
    packages = []
    if result["success"]:
        for line in result["stdout"].split("\n"):
            if line.startswith("package:"):
                packages.append(line.replace("package:", "").strip())
    return packages

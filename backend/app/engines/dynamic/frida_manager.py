"""
Frida Manager — Python Frida Integration
Manages Frida instrumentation sessions: attach to apps, inject hook scripts,
collect results, and detach cleanly.
"""

import os
import json
import time
import logging
import threading
from typing import Optional, Dict, Any, List, Callable

logger = logging.getLogger(__name__)

try:
    import frida
    FRIDA_AVAILABLE = True
except ImportError:
    FRIDA_AVAILABLE = False
    logger.warning("frida library not installed. Install it: pip install frida-tools")

# Default Frida scripts directory
SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "frida_scripts")


class FridaManager:
    """
    Manages a Frida instrumentation session for dynamic APK analysis.
    Handles script injection, message collection, and session lifecycle.
    """

    def __init__(self):
        self.device = None
        self.session = None
        self.scripts: List[Any] = []
        self.messages: List[Dict[str, Any]] = []
        self.errors: List[str] = []
        self._lock = threading.Lock()
        self._running = False

    def start_frida_server(self, device_id: Optional[str] = None) -> bool:
        """Attempt to start frida-server on the device via ADB."""
        from app.engines.dynamic.vm_orchestrator import _run_adb
        
        # Check if already running
        check = _run_adb(["shell", "ps", "|", "grep", "frida-server"], device=device_id)
        if check["success"] and "frida-server" in check["stdout"]:
            logger.info("frida-server is already running")
            return True
            
        logger.info("Attempting to start frida-server via ADB")
        
        # We assume frida-server is located at /data/local/tmp/frida-server
        # Run it in the background as root
        # First ensure it's executable
        _run_adb(["shell", "chmod", "755", "/data/local/tmp/frida-server"], device=device_id)
        
        # Start it
        res = _run_adb(["shell", "su", "-c", "'/data/local/tmp/frida-server &'" ], device=device_id)
        
        if res["success"]:
            # Give it a moment to bind
            time.sleep(2)
            return True
        else:
            self.errors.append(f"Failed to start frida-server: {res['error']}")
            return False

    def connect_device(self, device_id: Optional[str] = None) -> bool:
        """
        Connect to a Frida device (USB device or emulator).

        Args:
            device_id: Specific device ID/serial. If None, uses first USB device.

        Returns:
            True if connected successfully.
        """
        if not FRIDA_AVAILABLE:
            self.errors.append("frida library not installed")
            return False

        try:
            if device_id:
                self.device = frida.get_device(device_id)
            else:
                self.device = frida.get_usb_device(timeout=10)

            logger.info(f"Connected to Frida device: {self.device.name}")
            return True

        except frida.TimedOutError:
            self.errors.append("Frida device connection timed out")
            logger.error("Frida device connection timed out")
            return False
        except frida.ServerNotRunningError:
            logger.warning("Frida server not running. Attempting to start it automatically...")
            if self.start_frida_server(device_id):
                # Retry connection
                try:
                    if device_id:
                        self.device = frida.get_device(device_id)
                    else:
                        self.device = frida.get_usb_device(timeout=10)
                    logger.info(f"Connected to Frida device: {self.device.name} after auto-start")
                    return True
                except Exception as e:
                    self.errors.append(f"Failed to connect after starting frida-server: {e}")
                    return False
            
            self.errors.append("Frida server not running on device. Start frida-server first.")
            logger.error("Frida server not running on device")
            return False
        except Exception as e:
            self.errors.append(f"Frida device connection error: {e}")
            logger.error(f"Frida connection error: {e}")
            return False

    def attach_to_app(self, package_name: str, spawn: bool = False) -> bool:
        """
        Attach to a running app or spawn it with instrumentation.

        Args:
            package_name: Target app package name.
            spawn: If True, spawn the app (vs attaching to existing process).

        Returns:
            True if attached successfully.
        """
        if not self.device:
            self.errors.append("No device connected")
            return False

        try:
            if spawn:
                pid = self.device.spawn([package_name])
                self.session = self.device.attach(pid)
                logger.info(f"Spawned and attached to {package_name} (PID: {pid})")
            else:
                self.session = self.device.attach(package_name)
                logger.info(f"Attached to running process: {package_name}")

            self.session.on("detached", self._on_detached)
            self._running = True

            if spawn:
                self.device.resume(pid)

            return True

        except frida.ProcessNotFoundError:
            self.errors.append(f"Process not found: {package_name}. Is the app running?")
            logger.error(f"Process not found: {package_name}")
            return False
        except frida.PermissionError:
            self.errors.append("Frida permission denied. Check frida-server permissions.")
            logger.error("Frida permission denied")
            return False
        except Exception as e:
            self.errors.append(f"Frida attach error: {e}")
            logger.error(f"Frida attach error: {e}")
            return False

    def inject_script(self, script_source: str, script_name: str = "unnamed") -> bool:
        """
        Inject a JavaScript hook script into the attached session.

        Args:
            script_source: JavaScript source code.
            script_name: Name identifier for logging/tracking.

        Returns:
            True if script was injected successfully.
        """
        if not self.session:
            self.errors.append("No active session — call attach_to_app first")
            return False

        try:
            script = self.session.create_script(script_source)
            script.on("message", lambda msg, data: self._on_message(msg, data, script_name))
            script.load()
            self.scripts.append({"script": script, "name": script_name})
            logger.info(f"Injected script: {script_name}")
            return True

        except frida.InvalidOperationError as e:
            self.errors.append(f"Script injection failed ({script_name}): {e}")
            logger.error(f"Script injection failed: {e}")
            return False
        except Exception as e:
            self.errors.append(f"Script error ({script_name}): {e}")
            logger.error(f"Script error: {e}")
            return False

    def inject_script_file(self, script_path: str) -> bool:
        """Load and inject a script from a file."""
        if not os.path.exists(script_path):
            self.errors.append(f"Script file not found: {script_path}")
            return False

        try:
            with open(script_path, "r") as f:
                source = f.read()
            script_name = os.path.splitext(os.path.basename(script_path))[0]
            return self.inject_script(source, script_name)
        except Exception as e:
            self.errors.append(f"Failed to read script file {script_path}: {e}")
            return False

    def inject_all_hooks(self, scripts_dir: Optional[str] = None) -> Dict[str, bool]:
        """
        Inject all .js hook scripts from the scripts directory.

        Returns:
            Dict mapping script name to success/failure.
        """
        scripts_dir = scripts_dir or SCRIPTS_DIR
        results = {}

        if not os.path.isdir(scripts_dir):
            self.errors.append(f"Scripts directory not found: {scripts_dir}")
            return results

        for filename in sorted(os.listdir(scripts_dir)):
            if filename.endswith(".js"):
                script_path = os.path.join(scripts_dir, filename)
                success = self.inject_script_file(script_path)
                results[filename] = success

        return results

    def collect_messages(self, duration: float = 0) -> List[Dict[str, Any]]:
        """
        Collect all hook messages received so far.

        Args:
            duration: If > 0, wait this many seconds before collecting.

        Returns:
            List of all received messages.
        """
        if duration > 0:
            logger.info(f"Collecting hook data for {duration}s...")
            time.sleep(duration)

        with self._lock:
            messages = list(self.messages)

        logger.info(f"Collected {len(messages)} hook messages.")
        return messages

    def detach(self):
        """Cleanly detach from the instrumented process."""
        self._running = False

        for entry in self.scripts:
            try:
                entry["script"].unload()
            except Exception:
                pass

        if self.session:
            try:
                self.session.detach()
                logger.info("Detached from Frida session.")
            except Exception as e:
                logger.warning(f"Error during detach: {e}")

        self.session = None
        self.scripts = []

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the instrumentation session."""
        with self._lock:
            msg_count = len(self.messages)

        # Categorize messages by hook type
        categories = {}
        for msg in self.messages:
            hook = msg.get("hook", "unknown")
            categories[hook] = categories.get(hook, 0) + 1

        return {
            "total_messages": msg_count,
            "scripts_loaded": len(self.scripts),
            "errors": self.errors,
            "message_categories": categories,
            "is_attached": self.session is not None and self._running,
        }

    def _on_message(self, message: Dict, data: Any, script_name: str):
        """Handle incoming messages from Frida scripts."""
        if message["type"] == "send":
            payload = message.get("payload", {})
            if isinstance(payload, dict):
                payload["_script"] = script_name
                payload["_timestamp"] = time.time()
            with self._lock:
                self.messages.append(payload)
        elif message["type"] == "error":
            error_msg = f"Script error ({script_name}): {message.get('description', 'unknown')}"
            self.errors.append(error_msg)
            logger.warning(error_msg)

    def _on_detached(self, reason: str):
        """Handle session detach events."""
        self._running = False
        logger.info(f"Frida session detached: {reason}")


def create_manager() -> FridaManager:
    """Factory function to create a new FridaManager instance."""
    return FridaManager()

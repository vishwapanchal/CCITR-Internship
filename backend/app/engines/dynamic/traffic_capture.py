"""
Traffic Capture — mitmproxy & tcpdump Integration
Manages network traffic interception during dynamic analysis:
- mitmproxy for HTTPS decryption and HTTP flow logging
- tcpdump for raw PCAP capture
"""

import os
import subprocess
import signal
import time
import json
import shutil
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Timeouts
DEFAULT_CAPTURE_DURATION = 300  # 5 minutes
PROCESS_KILL_TIMEOUT = 10


class TrafficCapture:
    """
    Manages network traffic capture processes for dynamic APK analysis.
    """

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        self._mitmproxy_proc = None
        self._tcpdump_proc = None
        self.pcap_path = os.path.join(output_dir, "network_traffic.pcap")
        self.flows_path = os.path.join(output_dir, "decrypted_http.json")
        self.mitm_dump_path = os.path.join(output_dir, "mitmproxy_flows")

    def start_tcpdump(self, interface: str = "any", device_serial: Optional[str] = None) -> bool:
        """
        Start tcpdump PCAP capture.

        For on-device capture (via ADB), runs tcpdump on the Android device.
        For host-based capture, runs tcpdump locally.

        Args:
            interface: Network interface to capture on.
            device_serial: If provided, runs tcpdump on device via ADB.

        Returns:
            True if capture started successfully.
        """
        import platform
        is_windows = platform.system() == "Windows"
        
        # Force device_serial capture on Windows since tcpdump isn't natively available
        if is_windows and not device_serial:
            logger.warning("Windows host detected without device_serial. tcpdump capture will fail.")
            return False
            
        if device_serial:
            return self._start_device_tcpdump(device_serial)

        tcpdump_bin = shutil.which("tcpdump")
        if not tcpdump_bin:
            logger.warning("tcpdump not found on system PATH")
            return False

        cmd = [
            tcpdump_bin,
            "-i", interface,
            "-w", self.pcap_path,
            "-s", "0",  # Full packet capture
        ]

        try:
            self._tcpdump_proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            logger.info(f"tcpdump started (PID: {self._tcpdump_proc.pid})")
            return True
        except PermissionError:
            logger.error("tcpdump requires root/sudo. Run with elevated privileges.")
            return False
        except Exception as e:
            logger.error(f"Failed to start tcpdump: {e}")
            return False

    def _start_device_tcpdump(self, device_serial: str) -> bool:
        """Start tcpdump on Android device via ADB."""
        adb = shutil.which("adb")
        if not adb:
            from app.engines.dynamic.vm_orchestrator import _find_adb
            adb = _find_adb()
            if not adb:
                logger.warning("adb not found — cannot run tcpdump on device")
                return False

        remote_pcap = "/sdcard/capture.pcap"
        cmd = [
            adb, "-s", device_serial,
            "shell", "tcpdump", "-i", "any",
            "-w", remote_pcap, "-s", "0"
        ]

        try:
            self._tcpdump_proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            self._device_serial = device_serial
            self._remote_pcap = remote_pcap
            logger.info(f"tcpdump started on device {device_serial}")
            return True
        except Exception as e:
            logger.error(f"Failed to start device tcpdump: {e}")
            return False

    def start_mitmproxy(self, port: int = 8080, mode: str = "regular") -> bool:
        """
        Start mitmproxy for HTTPS traffic interception.

        Args:
            port: Proxy port number.
            mode: Proxy mode ('regular', 'transparent', 'upstream').

        Returns:
            True if mitmproxy started successfully.
        """
        mitmdump_bin = shutil.which("mitmdump") or shutil.which("mitmdump.exe")
        if not mitmdump_bin:
            logger.warning(
                "mitmdump not found. Install: pip install mitmproxy"
            )
            return False

        # Create a mitmproxy addon script to dump flows
        addon_script = self._create_mitm_addon()

        cmd = [
            mitmdump_bin,
            "--listen-port", str(port),
            "--set", f"flow_detail=3",
            "-s", addon_script,
            "--ssl-insecure",  # Accept invalid upstream certs
        ]

        if mode == "transparent":
            cmd.extend(["--mode", "transparent"])

        try:
            self._mitmproxy_proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            logger.info(f"mitmproxy started on port {port} (PID: {self._mitmproxy_proc.pid})")
            time.sleep(2)  # Give it time to bind
            return True
        except Exception as e:
            logger.error(f"Failed to start mitmproxy: {e}")
            return False

    def _create_mitm_addon(self) -> str:
        """Create a mitmproxy addon script to log HTTP flows to JSON."""
        addon_path = os.path.join(self.output_dir, "_mitm_addon.py")
        addon_code = f'''
import json
import os
from mitmproxy import http

flows_file = "{self.flows_path}"
flows = []

def response(flow: http.HTTPFlow):
    entry = {{
        "timestamp": flow.request.timestamp_start,
        "method": flow.request.method,
        "url": flow.request.pretty_url,
        "host": flow.request.host,
        "port": flow.request.port,
        "scheme": flow.request.scheme,
        "request_headers": dict(flow.request.headers),
        "request_content_length": len(flow.request.content) if flow.request.content else 0,
        "response_status": flow.response.status_code if flow.response else None,
        "response_headers": dict(flow.response.headers) if flow.response else {{}},
        "response_content_length": len(flow.response.content) if flow.response and flow.response.content else 0,
        "response_content_type": flow.response.headers.get("content-type", "") if flow.response else "",
    }}
    flows.append(entry)

    # Write incrementally
    with open(flows_file, "w") as f:
        json.dump(flows, f, indent=2, default=str)

def done():
    with open(flows_file, "w") as f:
        json.dump(flows, f, indent=2, default=str)
'''
        with open(addon_path, "w") as f:
            f.write(addon_code)
        return addon_path

    def stop_capture(self) -> Dict[str, Any]:
        """
        Stop all capture processes and collect output files.

        Returns:
            Dict with paths to captured files and summary stats.
        """
        result = {
            "pcap_path": None,
            "flows_path": None,
            "pcap_size": 0,
            "flows_count": 0,
        }

        # Stop tcpdump
        if self._tcpdump_proc:
            try:
                self._tcpdump_proc.send_signal(signal.SIGINT)
                self._tcpdump_proc.wait(timeout=PROCESS_KILL_TIMEOUT)
            except subprocess.TimeoutExpired:
                self._tcpdump_proc.kill()
            except Exception as e:
                logger.warning(f"Error stopping tcpdump: {e}")

            # If we were capturing on device, pull the PCAP
            if hasattr(self, '_device_serial') and hasattr(self, '_remote_pcap'):
                try:
                    adb = shutil.which("adb")
                    if adb:
                        subprocess.run(
                            [adb, "-s", self._device_serial, "pull",
                             self._remote_pcap, self.pcap_path],
                            timeout=30
                        )
                except Exception as e:
                    logger.warning(f"Failed to pull PCAP from device: {e}")

            self._tcpdump_proc = None

        # Stop mitmproxy
        if self._mitmproxy_proc:
            try:
                self._mitmproxy_proc.send_signal(signal.SIGINT)
                self._mitmproxy_proc.wait(timeout=PROCESS_KILL_TIMEOUT)
            except subprocess.TimeoutExpired:
                self._mitmproxy_proc.kill()
            except Exception as e:
                logger.warning(f"Error stopping mitmproxy: {e}")
            self._mitmproxy_proc = None

        # Collect results
        if os.path.exists(self.pcap_path):
            result["pcap_path"] = self.pcap_path
            result["pcap_size"] = os.path.getsize(self.pcap_path)

        if os.path.exists(self.flows_path):
            result["flows_path"] = self.flows_path
            try:
                with open(self.flows_path, "r") as f:
                    flows = json.load(f)
                    result["flows_count"] = len(flows)
            except Exception:
                pass

        # Clean up addon script
        addon_path = os.path.join(self.output_dir, "_mitm_addon.py")
        if os.path.exists(addon_path):
            os.remove(addon_path)

        logger.info(
            f"Traffic capture stopped: PCAP={result['pcap_size']} bytes, "
            f"HTTP flows={result['flows_count']}"
        )

        return result

    def is_capturing(self) -> bool:
        """Check if any capture processes are running."""
        tcpdump_running = self._tcpdump_proc and self._tcpdump_proc.poll() is None
        mitm_running = self._mitmproxy_proc and self._mitmproxy_proc.poll() is None
        return tcpdump_running or mitm_running


def create_capture(output_dir: str) -> TrafficCapture:
    """Factory function to create a new TrafficCapture instance."""
    return TrafficCapture(output_dir)

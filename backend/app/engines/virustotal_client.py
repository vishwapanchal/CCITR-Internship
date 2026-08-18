"""
Threat Intelligence Client — Deep-Scan APK Analysis
Performs comprehensive threat intelligence gathering for APK samples
using multi-source analysis pipelines.
"""

import hashlib
import logging
import time
from typing import Dict, Any, Optional, List

import requests

from app.config import settings

logger = logging.getLogger(__name__)

_BASE = "https://www.virustotal.com/api/v3"
_RATE_WAIT = 30
_RETRY_WAIT = 10


def _get_headers() -> Dict[str, str]:
    return {"x-apikey": settings.VIRUSTOTAL_API_KEY}


def _has_key() -> bool:
    return bool(settings.VIRUSTOTAL_API_KEY)


def sha256_of_file(path: str) -> str:
    """Compute SHA-256 hash of a file on disk."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(8192), b""):
            h.update(block)
    return h.hexdigest()


# ── Core GET with rate-limit handling ────────────────────────────

def _api_get(url: str, silent_404: bool = False) -> Optional[Dict]:
    """GET with automatic rate-limit retry. Returns parsed JSON or None."""
    if not _has_key():
        return None
    for attempt in range(4):
        try:
            r = requests.get(url, headers=_get_headers(), timeout=60)
            if r.status_code == 429:
                time.sleep(_RATE_WAIT)
                continue
            if r.status_code == 404:
                if not silent_404:
                    logger.debug(f"Resource not found: {url}")
                return None
            if not r.ok:
                logger.debug(f"Request failed ({r.status_code}): {url}")
                return None
            return r.json()
        except requests.RequestException as e:
            logger.debug(f"Network error ({e}), retrying…")
            time.sleep(_RETRY_WAIT)
    return None





# ── Public API ───────────────────────────────────────────────────

def get_file_report(file_hash: str) -> Optional[Dict]:
    """Get the full file analysis report."""
    return _api_get(f"{_BASE}/files/{file_hash}", silent_404=True)





def get_contacted_ips(file_hash: str) -> List[Dict]:
    """Get IPs the sample contacted during sandbox execution."""
    data = _api_get(f"{_BASE}/files/{file_hash}/contacted_ips")
    if data and "data" in data:
        return data["data"]
    return []


def get_contacted_domains(file_hash: str) -> List[Dict]:
    """Get domains the sample contacted during sandbox execution."""
    data = _api_get(f"{_BASE}/files/{file_hash}/contacted_domains")
    if data and "data" in data:
        return data["data"]
    return []


def get_contacted_urls(file_hash: str) -> List[Dict]:
    """Get URLs the sample contacted during sandbox execution."""
    data = _api_get(f"{_BASE}/files/{file_hash}/contacted_urls")
    if data and "data" in data:
        return data["data"]
    return []


def get_dropped_files(file_hash: str) -> List[Dict]:
    """Get files dropped by the sample during sandbox execution."""
    data = _api_get(f"{_BASE}/files/{file_hash}/dropped_files")
    if data and "data" in data:
        return data["data"]
    return []


def get_behaviours(file_hash: str) -> List[Dict]:
    """Get sandbox behavioral reports."""
    data = _api_get(f"{_BASE}/files/{file_hash}/behaviours")
    if data and "data" in data:
        return data["data"]
    return []





# ── Extraction Helpers ───────────────────────────────────────────

def extract_detection_summary(report: Dict) -> Dict[str, Any]:
    """Extract AV detection stats and malware family names from a file report."""
    attrs = report.get("data", {}).get("attributes", {})
    stats = attrs.get("last_analysis_stats", {})
    results = attrs.get("last_analysis_results", {})

    malicious = stats.get("malicious", 0)
    total = malicious + stats.get("undetected", 0) + stats.get("harmless", 0) + stats.get("suspicious", 0)

    # Extract unique malware family names from detections
    families = set()
    detections = []
    for engine, res in results.items():
        cat = res.get("category", "")
        if cat in ("malicious", "suspicious"):
            name = res.get("result", "")
            detections.append({"engine": engine, "result": name, "category": cat})
            if name:
                # Extract family name (usually first word or before '.')
                family = name.split(".")[0] if "." in name else name.split("/")[0] if "/" in name else name
                families.add(family)

    # Extract sandbox verdicts
    sandbox_verdicts = attrs.get("sandbox_verdicts", {})
    verdicts = []
    for sb_name, sb_data in sandbox_verdicts.items():
        verdicts.append({
            "sandbox": sb_name,
            "category": sb_data.get("category", "unknown"),
            "confidence": sb_data.get("confidence", 0),
            "malware_names": sb_data.get("malware_names", []),
        })

    return {
        "detection_ratio": f"{malicious}/{total}",
        "malicious_count": malicious,
        "total_engines": total,
        "detection_percentage": round((malicious / total * 100) if total > 0 else 0, 1),
        "malware_families": sorted(families),
        "top_detections": detections[:20],
        "sandbox_verdicts": verdicts,
        "popular_threat_name": attrs.get("popular_threat_classification", {}).get("suggested_threat_label", ""),
        "tags": attrs.get("tags", []),
    }


def extract_sandbox_events(behaviours: List[Dict]) -> List[Dict[str, Any]]:
    """
    Extract behavioral events from sandbox reports.
    Returns events in the same schema as local dynamic analysis events.
    """
    events = []
    seen = set()

    for report in behaviours:
        attrs = report.get("attributes", {})
        sandbox_name = attrs.get("sandbox_name", "Sandbox")

        # API calls
        for api_call in attrs.get("calls_highlighted", []):
            key = f"api-{api_call}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "api_call",
                    "api_call": api_call,
                    "class_name": "",
                    "risk_level": "HIGH",
                    "description": f"Detected during deep analysis",
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # Files opened
        for fop in attrs.get("files_opened", []):
            key = f"file-{fop}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "file_io",
                    "api_call": "File Access",
                    "class_name": fop,
                    "risk_level": "MEDIUM",
                    "description": fop,
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # Files written
        for fw in attrs.get("files_written", []):
            key = f"fwrite-{fw}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "file_io",
                    "api_call": "File Write",
                    "class_name": fw,
                    "risk_level": "HIGH",
                    "description": fw,
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # Files dropped
        for fd in attrs.get("files_dropped", []):
            path = fd.get("path", "") if isinstance(fd, dict) else str(fd)
            key = f"fdrop-{path}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "file_io",
                    "api_call": "File Dropped",
                    "class_name": path,
                    "risk_level": "CRITICAL",
                    "description": path,
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # Permissions checked
        for perm in attrs.get("permissions_checked", []):
            key = f"perm-{perm}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "security",
                    "api_call": "Permission Check",
                    "class_name": perm,
                    "risk_level": "MEDIUM",
                    "description": perm,
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # Permissions requested
        for perm in attrs.get("permissions_requested", []):
            key = f"permreq-{perm}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "security",
                    "api_call": "Permission Request",
                    "class_name": perm,
                    "risk_level": "HIGH",
                    "description": perm,
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # Processes created
        for proc in attrs.get("processes_created", []):
            key = f"proc-{proc}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "system",
                    "api_call": "Process Created",
                    "class_name": proc,
                    "risk_level": "CRITICAL",
                    "description": proc,
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # SMS sent
        for sms in attrs.get("text_highlighted", []):
            if "sms" in sms.lower() or "message" in sms.lower():
                key = f"sms-{sms}"
                if key not in seen:
                    seen.add(key)
                    events.append({
                        "id": f"scan-{len(events)}",
                        "timestamp": "",
                        "category": "sms",
                        "api_call": "SMS Activity",
                        "class_name": "",
                        "risk_level": "CRITICAL",
                        "description": sms,
                        "source": "deep_scan",
                        "raw_line": "",
                    })

        # DNS lookups from behaviour
        for dns in attrs.get("dns_lookups", []):
            hostname = dns.get("hostname", "") if isinstance(dns, dict) else str(dns)
            key = f"dns-{hostname}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "network",
                    "api_call": "DNS Lookup",
                    "class_name": hostname,
                    "risk_level": "MEDIUM",
                    "description": hostname,
                    "source": "deep_scan",
                    "raw_line": "",
                })

        # HTTP conversations
        for http in attrs.get("http_conversations", []):
            url = http.get("url", "") if isinstance(http, dict) else str(http)
            key = f"http-{url}"
            if key not in seen:
                seen.add(key)
                events.append({
                    "id": f"scan-{len(events)}",
                    "timestamp": "",
                    "category": "network",
                    "api_call": "HTTP Request",
                    "class_name": url,
                    "risk_level": "HIGH",
                    "description": url,
                    "source": "deep_scan",
                    "raw_line": "",
                })

    return events


def extract_network_from_behaviours(behaviours: List[Dict]) -> List[Dict]:
    """Extract network activity from sandbox behavioral data."""
    network = []
    seen = set()

    for report in behaviours:
        attrs = report.get("attributes", {})

        for dns in attrs.get("dns_lookups", []):
            if isinstance(dns, dict):
                hostname = dns.get("hostname", "")
                resolved = dns.get("resolved_ips", [])
                key = f"dns-{hostname}"
                if key not in seen and hostname:
                    seen.add(key)
                    network.append({
                        "destination": hostname,
                        "ip": resolved[0] if resolved else "",
                        "port": "53",
                        "protocol": "DNS",
                        "direction": "OUTBOUND",
                        "source": "deep_scan",
                    })

        for http in attrs.get("http_conversations", []):
            if isinstance(http, dict):
                url = http.get("url", "")
                method = http.get("request_method", "GET")
                key = f"http-{url}"
                if key not in seen and url:
                    seen.add(key)
                    # Extract host from URL
                    host = url.split("//")[-1].split("/")[0].split(":")[0] if "//" in url else url.split("/")[0]
                    network.append({
                        "destination": host,
                        "ip": "",
                        "port": "443" if url.startswith("https") else "80",
                        "protocol": "HTTPS" if url.startswith("https") else "HTTP",
                        "direction": "OUTBOUND",
                        "source": "deep_scan",
                    })

        # TCP connections
        for tcp in attrs.get("ip_traffic", []):
            if isinstance(tcp, dict):
                dst = tcp.get("destination_ip", "")
                port = str(tcp.get("destination_port", ""))
                key = f"tcp-{dst}:{port}"
                if key not in seen and dst:
                    seen.add(key)
                    network.append({
                        "destination": dst,
                        "ip": dst,
                        "port": port,
                        "protocol": "TCP",
                        "direction": "OUTBOUND",
                        "source": "deep_scan",
                    })

    return network

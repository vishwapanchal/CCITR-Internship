"""
PCAP Analyzer — parses the raw .pcap file captured by PCAPdroid during a
manual penetration-testing session and turns it into structured, per-flow
network statistics: byte counts, packet counts, inbound/outbound direction,
protocol, and simple suspicious-traffic heuristics.

PCAPdroid captures via Android's VPNService API, so its dumps use a raw-IP
link layer (no Ethernet header) rather than a classic Ethernet capture. This
module handles both, falling back gracefully if the link type is unexpected.
"""

import logging
import socket
from collections import defaultdict
from typing import Any, Dict, List, Optional

import dpkt

logger = logging.getLogger(__name__)

# A single flow is considered "large" above this many bytes.
LARGE_FLOW_BYTES = 2 * 1024 * 1024  # 2 MB
# A destination contacted at least this many times with low timing variance
# is flagged as possible periodic beaconing (C2 check-in pattern).
BEACON_MIN_HITS = 5
BEACON_MAX_JITTER_SECONDS = 3.0


def _ip_to_str(raw: bytes) -> str:
    if len(raw) == 4:
        return socket.inet_ntoa(raw)
    return socket.inet_ntop(socket.AF_INET6, raw)


def _parse_ip_packet(buf: bytes, linktype: int):
    """Try to extract an IP packet from a raw capture buffer, regardless of link type."""
    if linktype == dpkt.pcap.DLT_EN10MB:
        eth = dpkt.ethernet.Ethernet(buf)
        ip = eth.data
        if isinstance(ip, (dpkt.ip.IP, dpkt.ip6.IP6)):
            return ip
        return None
    if linktype == dpkt.pcap.DLT_LINUX_SLL:
        sll = dpkt.sll.SLL(buf)
        ip = sll.data
        if isinstance(ip, (dpkt.ip.IP, dpkt.ip6.IP6)):
            return ip
        return None
    # Raw IP (PCAPdroid's default) or unknown link type: try IPv4, then IPv6.
    try:
        return dpkt.ip.IP(buf)
    except (dpkt.dpkt.UnpackError, IndexError):
        try:
            return dpkt.ip6.IP6(buf)
        except (dpkt.dpkt.UnpackError, IndexError):
            return None


def analyze_pcap(pcap_path: str, device_ip: Optional[str] = None) -> Dict[str, Any]:
    """
    Parse a .pcap file and return byte/packet counts, direction breakdown,
    per-flow detail, and suspicious-traffic indicators.

    device_ip: the monitored device's own IP address (from `adb shell ip route
    get`), used to classify each packet as inbound or outbound. Without it,
    direction cannot be determined and every packet is reported as "UNKNOWN".
    """
    try:
        with open(pcap_path, "rb") as f:
            reader = dpkt.pcap.Reader(f)
            linktype = reader.datalink()

            total_packets = 0
            total_bytes = 0
            direction_stats = {
                "INBOUND": {"packets": 0, "bytes": 0},
                "OUTBOUND": {"packets": 0, "bytes": 0},
                "UNKNOWN": {"packets": 0, "bytes": 0},
            }
            protocol_counts: Dict[str, int] = defaultdict(int)
            flows: Dict[tuple, Dict[str, Any]] = {}
            unparsed_packets = 0

            for ts, buf in reader:
                total_packets += 1
                total_bytes += len(buf)

                ip = _parse_ip_packet(buf, linktype)
                if ip is None:
                    unparsed_packets += 1
                    direction_stats["UNKNOWN"]["packets"] += 1
                    direction_stats["UNKNOWN"]["bytes"] += len(buf)
                    continue

                try:
                    src_ip = _ip_to_str(ip.src)
                    dst_ip = _ip_to_str(ip.dst)
                except Exception:
                    unparsed_packets += 1
                    continue

                proto = "OTHER"
                src_port = dst_port = None
                if isinstance(ip.data, dpkt.tcp.TCP):
                    proto = "TCP"
                    src_port, dst_port = ip.data.sport, ip.data.dport
                elif isinstance(ip.data, dpkt.udp.UDP):
                    proto = "UDP"
                    src_port, dst_port = ip.data.sport, ip.data.dport
                protocol_counts[proto] += 1

                if device_ip and src_ip == device_ip:
                    direction = "OUTBOUND"
                    remote_ip, remote_port = dst_ip, dst_port
                elif device_ip and dst_ip == device_ip:
                    direction = "INBOUND"
                    remote_ip, remote_port = src_ip, src_port
                else:
                    direction = "UNKNOWN"
                    remote_ip, remote_port = dst_ip, dst_port

                direction_stats[direction]["packets"] += 1
                direction_stats[direction]["bytes"] += len(buf)

                flow_key = (remote_ip, remote_port, proto)
                flow = flows.setdefault(flow_key, {
                    "remote_ip": remote_ip,
                    "remote_port": remote_port,
                    "protocol": proto,
                    "direction": direction,
                    "packets": 0,
                    "bytes": 0,
                    "first_seen": ts,
                    "last_seen": ts,
                    "_timestamps": [],
                })
                flow["packets"] += 1
                flow["bytes"] += len(buf)
                flow["last_seen"] = ts
                flow["_timestamps"].append(ts)
                if direction != "UNKNOWN":
                    flow["direction"] = direction

            flow_list = _finalize_flows(flows)
            suspicious = _detect_suspicious(flow_list, total_bytes)

            return {
                "status": "success",
                "total_packets": total_packets,
                "total_bytes": total_bytes,
                "unparsed_packets": unparsed_packets,
                "direction_summary": {
                    "inbound_packets": direction_stats["INBOUND"]["packets"],
                    "inbound_bytes": direction_stats["INBOUND"]["bytes"],
                    "outbound_packets": direction_stats["OUTBOUND"]["packets"],
                    "outbound_bytes": direction_stats["OUTBOUND"]["bytes"],
                    "unknown_direction_packets": direction_stats["UNKNOWN"]["packets"],
                    "unknown_direction_bytes": direction_stats["UNKNOWN"]["bytes"],
                },
                "protocol_breakdown": dict(protocol_counts),
                "flows": flow_list,
                "suspicious_indicators": suspicious,
                "device_ip_used": device_ip,
            }
    except FileNotFoundError:
        return {"status": "error", "error": f"PCAP file not found: {pcap_path}"}
    except Exception as e:
        logger.error(f"PCAP analysis failed for {pcap_path}: {e}")
        return {"status": "error", "error": str(e)}


def _finalize_flows(flows: Dict[tuple, Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = []
    for flow in flows.values():
        timestamps = sorted(flow.pop("_timestamps"))
        flow["packet_intervals"] = [
            round(timestamps[i + 1] - timestamps[i], 3) for i in range(len(timestamps) - 1)
        ]
        result.append(flow)
    result.sort(key=lambda f: f["bytes"], reverse=True)
    return result


def _detect_suspicious(flows: List[Dict[str, Any]], total_bytes: int) -> List[Dict[str, Any]]:
    """Simple, explainable heuristics — not a replacement for the ML/YARA engines,
    just concrete network-level indicators to feed into the risk score and report."""
    indicators = []

    for flow in flows:
        if flow["bytes"] >= LARGE_FLOW_BYTES:
            indicators.append({
                "type": "large_data_transfer",
                "severity": "high",
                "description": (
                    f"{flow['bytes'] / (1024*1024):.1f} MB transferred with "
                    f"{flow['remote_ip']}:{flow['remote_port']} ({flow['protocol']}, {flow['direction']})"
                ),
                "remote_ip": flow["remote_ip"],
            })

        intervals = flow.get("packet_intervals", [])
        if len(intervals) >= BEACON_MIN_HITS - 1:
            avg = sum(intervals) / len(intervals)
            jitter = max(intervals) - min(intervals) if len(intervals) > 1 else 0
            if avg > 0 and jitter <= BEACON_MAX_JITTER_SECONDS:
                indicators.append({
                    "type": "periodic_beaconing",
                    "severity": "critical",
                    "description": (
                        f"Regular check-ins to {flow['remote_ip']}:{flow['remote_port']} "
                        f"every ~{avg:.1f}s ({flow['packets']} packets) — possible C2 beaconing"
                    ),
                    "remote_ip": flow["remote_ip"],
                })

    if total_bytes > 0:
        outbound = sum(f["bytes"] for f in flows if f["direction"] == "OUTBOUND")
        if outbound / total_bytes > 0.85 and outbound >= 512 * 1024:
            indicators.append({
                "type": "exfiltration_pattern",
                "severity": "high",
                "description": (
                    f"{outbound / (1024*1024):.1f} MB ({outbound / total_bytes:.0%} of all traffic) "
                    "sent outbound with comparatively little inbound response — possible data exfiltration"
                ),
            })

    return indicators

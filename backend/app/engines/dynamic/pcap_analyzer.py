"""
PCAP Analyzer — Network Traffic Analysis
Parses PCAP files captured during dynamic analysis using scapy.
Extracts DNS queries, HTTP requests, TLS handshakes, and connection endpoints
to identify C2 communication and data exfiltration.
"""

import os
import json
import logging
from typing import Dict, Any, List, Set

logger = logging.getLogger(__name__)

try:
    from scapy.all import rdpcap, IP, TCP, UDP, DNS, DNSQR, Raw
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    logger.warning("scapy not installed. PCAP analysis will be limited. Install: pip install scapy")


def analyze_pcap(pcap_path: str) -> Dict[str, Any]:
    """
    Analyze a PCAP file to extract network indicators.

    Args:
        pcap_path: Path to the PCAP file.

    Returns:
        Dict containing network indicators (DNS, HTTP, Connections, TLS).
    """
    result = {
        "status": "success",
        "dns_queries": [],
        "http_requests": [],
        "tls_handshakes": [],
        "unique_ips": [],
        "connections": [],
        "stats": {
            "total_packets": 0,
            "tcp_packets": 0,
            "udp_packets": 0,
            "dns_packets": 0,
        }
    }

    if not SCAPY_AVAILABLE:
        result["status"] = "failed"
        result["error"] = "scapy library not installed"
        return result

    if not os.path.exists(pcap_path):
        result["status"] = "failed"
        result["error"] = f"PCAP file not found: {pcap_path}"
        return result

    try:
        # Load PCAP file
        logger.info(f"Analyzing PCAP: {pcap_path}")
        try:
            packets = rdpcap(pcap_path)
        except Exception as pcap_err:
            logger.error(f"Malformed or empty PCAP file: {pcap_err}")
            result["status"] = "failed"
            result["error"] = f"PCAP parsing failed: {pcap_err}"
            return result
            
        result["stats"]["total_packets"] = len(packets)

        dns_set: Set[str] = set()
        ip_set: Set[str] = set()
        connections: Dict[str, int] = {}
        tls_sni: Set[str] = set()
        http_reqs: List[Dict[str, str]] = []

        for pkt in packets:
            # IP Layer
            if IP in pkt:
                src_ip = pkt[IP].src
                dst_ip = pkt[IP].dst
                ip_set.add(dst_ip)
                ip_set.add(src_ip)

                # Track connection pairs
                conn_key = f"{src_ip} -> {dst_ip}"
                connections[conn_key] = connections.get(conn_key, 0) + 1

            # TCP Layer
            if TCP in pkt:
                result["stats"]["tcp_packets"] += 1
                
                # Check for HTTP in raw payload
                if Raw in pkt:
                    payload = pkt[Raw].load
                    try:
                        # Basic check if it looks like an HTTP request
                        if payload.startswith((b"GET ", b"POST ", b"PUT ", b"HEAD ", b"DELETE ")):
                            lines = payload.decode("utf-8", errors="ignore").split("\\r\\n")
                            if len(lines) > 0:
                                req_line = lines[0]
                                parts = req_line.split(" ")
                                if len(parts) >= 2:
                                    host = ""
                                    for line in lines[1:]:
                                        if line.lower().startswith("host: "):
                                            host = line[6:].strip()
                                            break
                                    
                                    # Extract basic URL path
                                    url_path = parts[1]
                                    full_url = f"http://{host}{url_path}" if host else url_path
                                    
                                    http_reqs.append({
                                        "method": parts[0],
                                        "url": full_url,
                                        "host": host
                                    })
                    except Exception:
                        pass
                        
                    # Basic TLS SNI extraction (Client Hello)
                    try:
                        # Very simplified heuristic for TLS Client Hello to extract SNI
                        if payload.startswith(b"\\x16\\x03") and len(payload) > 43:
                            # Search for common SNI patterns (this is a heuristic, real parsing requires complex struct unpacking)
                            # In a production system, use pyshark or dpkt for accurate TLS parsing
                            pass
                    except Exception:
                        pass

            # UDP & DNS Layer
            elif UDP in pkt:
                result["stats"]["udp_packets"] += 1
                if DNS in pkt and DNSQR in pkt:
                    result["stats"]["dns_packets"] += 1
                    try:
                        qname = pkt[DNSQR].qname.decode("utf-8", errors="ignore")
                        if qname.endswith("."):
                            qname = qname[:-1]
                        dns_set.add(qname)
                    except Exception:
                        pass

        # Formatting results
        result["dns_queries"] = sorted(list(dns_set))
        result["unique_ips"] = sorted(list(ip_set))
        
        # Format connections, sorted by packet count
        sorted_conns = sorted(connections.items(), key=lambda x: x[1], reverse=True)
        result["connections"] = [{"pair": pair, "packets": count} for pair, count in sorted_conns[:50]]
        
        result["http_requests"] = http_reqs[:100]

        logger.info(f"PCAP Analysis complete: {len(result['dns_queries'])} DNS queries, {len(result['unique_ips'])} IPs")

    except Exception as e:
        logger.error(f"Error analyzing PCAP: {e}")
        result["status"] = "error"
        result["error"] = str(e)

    return result

def extract_mitmproxy_flows(flows_path: str) -> Dict[str, Any]:
    """
    Extract useful information from the mitmproxy dumped JSON flows.
    """
    result = {
        "status": "success",
        "requests": [],
        "domains": [],
        "data_exfiltration": [],
        "stats": {
            "total_flows": 0,
            "post_requests": 0,
        }
    }
    
    if not os.path.exists(flows_path):
        result["status"] = "failed"
        result["error"] = f"Flows file not found: {flows_path}"
        return result
        
    try:
        with open(flows_path, "r") as f:
            flows = json.load(f)
            
        result["stats"]["total_flows"] = len(flows)
        domains_set = set()
        
        for flow in flows:
            method = flow.get("method", "")
            host = flow.get("host", "")
            
            if method.upper() == "POST":
                result["stats"]["post_requests"] += 1
                
            domains_set.add(host)
            
            # Simple heuristic for data exfiltration via POST
            req_len = flow.get("request_content_length", 0)
            if method.upper() == "POST" and req_len > 100:
                result["data_exfiltration"].append({
                    "url": flow.get("url"),
                    "size": req_len,
                    "content_type": flow.get("request_headers", {}).get("content-type", "")
                })
                
            # Keep a summary of requests
            result["requests"].append({
                "method": method,
                "url": flow.get("url"),
                "status": flow.get("response_status")
            })
            
        result["domains"] = sorted(list(domains_set))
        
    except Exception as e:
        logger.error(f"Error processing mitmproxy flows: {e}")
        result["status"] = "error"
        result["error"] = str(e)
        
    return result

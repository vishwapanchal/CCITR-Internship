import socket
import struct
import io

import dpkt
import pytest

from app.engines.dynamic import pcap_analyzer

DEVICE_IP = "10.0.0.5"
REMOTE_IP = "93.184.216.34"


def _build_tcp_packet(src_ip: str, dst_ip: str, src_port: int, dst_port: int, payload_len: int) -> bytes:
    tcp = dpkt.tcp.TCP(sport=src_port, dport=dst_port, seq=1, ack=0, flags=dpkt.tcp.TH_SYN)
    tcp.data = b"A" * payload_len
    ip = dpkt.ip.IP(
        src=socket.inet_aton(src_ip),
        dst=socket.inet_aton(dst_ip),
        p=dpkt.ip.IP_PROTO_TCP,
    )
    ip.data = tcp
    ip.len = len(bytes(ip))
    return bytes(ip)


def _build_udp_packet(src_ip: str, dst_ip: str, src_port: int, dst_port: int, payload_len: int) -> bytes:
    udp = dpkt.udp.UDP(sport=src_port, dport=dst_port, data=b"B" * payload_len)
    udp.ulen = len(bytes(udp))
    ip = dpkt.ip.IP(
        src=socket.inet_aton(src_ip),
        dst=socket.inet_aton(dst_ip),
        p=dpkt.ip.IP_PROTO_UDP,
    )
    ip.data = udp
    ip.len = len(bytes(ip))
    return bytes(ip)


def _write_pcap(tmp_path, packets, linktype=dpkt.pcap.DLT_RAW):
    pcap_path = tmp_path / "capture.pcap"
    with open(pcap_path, "wb") as f:
        writer = dpkt.pcap.Writer(f, linktype=linktype)
        ts = 1_700_000_000.0
        for buf, delta in packets:
            ts += delta
            writer.writepkt(buf, ts=ts)
    return str(pcap_path)


def test_basic_outbound_and_inbound_classification(tmp_path):
    packets = [
        (_build_tcp_packet(DEVICE_IP, REMOTE_IP, 51000, 443, 500), 0.0),
        (_build_tcp_packet(REMOTE_IP, DEVICE_IP, 443, 51000, 1400), 0.1),
    ]
    pcap_path = _write_pcap(tmp_path, packets)

    result = pcap_analyzer.analyze_pcap(pcap_path, device_ip=DEVICE_IP)

    assert result["status"] == "success"
    assert result["total_packets"] == 2
    ds = result["direction_summary"]
    assert ds["outbound_packets"] == 1
    assert ds["inbound_packets"] == 1
    assert ds["outbound_bytes"] > 0
    assert ds["inbound_bytes"] > 0
    assert result["protocol_breakdown"]["TCP"] == 2


def test_udp_protocol_detected(tmp_path):
    packets = [(_build_udp_packet(DEVICE_IP, REMOTE_IP, 53000, 53, 64), 0.0)]
    pcap_path = _write_pcap(tmp_path, packets)

    result = pcap_analyzer.analyze_pcap(pcap_path, device_ip=DEVICE_IP)

    assert result["status"] == "success"
    assert result["protocol_breakdown"].get("UDP") == 1


def test_direction_unknown_without_device_ip(tmp_path):
    packets = [(_build_tcp_packet(DEVICE_IP, REMOTE_IP, 51000, 443, 100), 0.0)]
    pcap_path = _write_pcap(tmp_path, packets)

    result = pcap_analyzer.analyze_pcap(pcap_path, device_ip=None)

    assert result["status"] == "success"
    assert result["direction_summary"]["unknown_direction_packets"] == 1
    assert result["direction_summary"]["outbound_packets"] == 0


def test_large_flow_flagged_as_suspicious(tmp_path):
    # Max IPv4 packet is 65535 bytes, so simulate a large flow with many
    # same-connection packets whose combined size exceeds the threshold.
    chunk = 60000
    packets = [
        (_build_tcp_packet(DEVICE_IP, REMOTE_IP, 51000, 443, chunk), 0.0 if i == 0 else 0.05)
        for i in range(40)  # 40 * 60000 bytes ~= 2.3 MB > LARGE_FLOW_BYTES
    ]
    pcap_path = _write_pcap(tmp_path, packets)

    result = pcap_analyzer.analyze_pcap(pcap_path, device_ip=DEVICE_IP)

    assert result["status"] == "success"
    types = [i["type"] for i in result["suspicious_indicators"]]
    assert "large_data_transfer" in types


def test_periodic_beaconing_detected(tmp_path):
    packets = [
        (_build_tcp_packet(DEVICE_IP, REMOTE_IP, 51000 + i, 443, 200), 10.0 if i > 0 else 0.0)
        for i in range(6)
    ]
    pcap_path = _write_pcap(tmp_path, packets)

    result = pcap_analyzer.analyze_pcap(pcap_path, device_ip=DEVICE_IP)

    types = [i["type"] for i in result["suspicious_indicators"]]
    assert "periodic_beaconing" in types


def test_missing_file_returns_error():
    result = pcap_analyzer.analyze_pcap("/nonexistent/path/does_not_exist.pcap", device_ip=DEVICE_IP)
    assert result["status"] == "error"
    assert "error" in result


def test_flows_are_sorted_by_bytes_descending(tmp_path):
    packets = [
        (_build_tcp_packet(DEVICE_IP, REMOTE_IP, 51000, 443, 100), 0.0),
        (_build_tcp_packet(DEVICE_IP, "1.2.3.4", 51001, 443, 5000), 0.1),
    ]
    pcap_path = _write_pcap(tmp_path, packets)

    result = pcap_analyzer.analyze_pcap(pcap_path, device_ip=DEVICE_IP)

    flows = result["flows"]
    assert len(flows) == 2
    assert flows[0]["bytes"] >= flows[1]["bytes"]
    assert flows[0]["remote_ip"] == "1.2.3.4"

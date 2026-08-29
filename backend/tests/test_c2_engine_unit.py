import json
import os
from unittest.mock import patch

from app.engines.c2 import graph_builder


@patch("app.engines.c2.virustotal_client._has_key", return_value=False)
def test_graph_builder_no_iocs(mock_has_key, tmp_path):
    """With no IOC/dynamic report files present, only the central APK node is built."""
    case_dir = tmp_path / "case_1"
    case_dir.mkdir()

    result = graph_builder.build_c2_graph(
        case_dir=str(case_dir),
        apk_hash="dummyhash",
        package_name="com.test.app",
    )

    assert result["status"] == "success"
    assert result["total_nodes"] == 1
    assert result["total_edges"] == 0
    assert result["nodes"][0]["id"] == "apk-com.test.app"


@patch("app.engines.c2.virustotal_client._has_key", return_value=False)
def test_graph_builder_with_static_iocs(mock_has_key, tmp_path):
    """Domains/IPs from the static IOC list become graph nodes with edges to the APK."""
    case_dir = tmp_path / "case_2"
    static_dir = case_dir / "static_analysis"
    static_dir.mkdir(parents=True)

    with open(static_dir / "ioc_list.json", "w") as f:
        json.dump({
            "domains": ["malicious-c2.example"],
            "ips": ["1.2.3.4"],
            "urls": [],
        }, f)

    result = graph_builder.build_c2_graph(
        case_dir=str(case_dir),
        apk_hash="dummyhash",
        package_name="com.test.app",
    )

    assert result["status"] == "success"
    node_ids = {n["id"] for n in result["nodes"]}
    assert "domain-malicious-c2.example" in node_ids
    assert "ip-1.2.3.4" in node_ids
    assert result["total_edges"] == 2  # APK -> domain, APK -> ip

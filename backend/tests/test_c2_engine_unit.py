import pytest
from unittest.mock import patch, MagicMock
from app.engines.c2 import infra_enricher, graph_builder

def test_infra_enricher_private_ip():
    """Test enrichment of a private IP address."""
    result = infra_enricher.enrich_ip("192.168.1.1")
    assert result["address"] == "192.168.1.1"
    assert result["is_private"] is True
    assert result["provider"] == "Private Network"

def test_infra_enricher_known_cloud():
    """Test enrichment of a known AWS IP range."""
    result = infra_enricher.enrich_ip("54.1.2.3")
    assert result["address"] == "54.1.2.3"
    assert result["is_private"] is False
    assert result["provider"] == "Amazon AWS"
    assert result["country"] == "US"

def test_infra_enricher_suspicious_domain():
    """Test enrichment of a suspicious TLD domain."""
    result = infra_enricher.enrich_domain("malware-c2.tk")
    assert result["domain"] == "malware-c2.tk"
    assert result["suspicious_tld"] is True
    assert result["tld"] == ".tk"
    assert any("Suspicious TLD" in indicator for indicator in result["risk_indicators"])

def test_infra_enricher_dga_domain():
    """Test enrichment of a DGA-like domain."""
    result = infra_enricher.enrich_domain("xkjqwdzbp9921.com")
    assert result["domain"] == "xkjqwdzbp9921.com"
    assert any("DGA" in indicator for indicator in result["risk_indicators"])

@patch("app.engines.c2.graph_builder.GraphDatabase")
def test_graph_builder_success(mock_graph_db, tmp_path):
    """Test Neo4j graph construction with mocked DB driver."""
    # Setup mock driver and session
    mock_driver = MagicMock()
    mock_session = MagicMock()
    mock_graph_db.driver.return_value = mock_driver
    mock_driver.session.return_value.__enter__.return_value = mock_session
    
    # Mock Neo4j responses to be empty for simplicity
    mock_session.run.return_value = []
    
    # Setup dummy case dir
    case_dir = tmp_path / "case_1"
    case_dir.mkdir()
    
    # Build graph
    result = graph_builder.build_c2_graph(
        case_id="case_1", 
        case_dir=str(case_dir), 
        apk_hash="dummyhash", 
        package_name="com.test.app"
    )
    
    assert result["status"] == "success"
    # Basic nodes (Case, APK) are created even if no IOCs exist
    assert result["nodes_created"] == 2
    assert result["relationships_created"] == 1
    
    # Ensure Neo4j run was called
    mock_session.run.assert_called()

@patch("app.engines.c2.graph_builder._get_driver")
def test_graph_builder_no_db(mock_get_driver, tmp_path):
    """Test graph builder handles DB unavailability."""
    mock_get_driver.return_value = None
    
    case_dir = tmp_path / "case_2"
    case_dir.mkdir()
    
    result = graph_builder.build_c2_graph(
        case_id="case_2", 
        case_dir=str(case_dir), 
        apk_hash="dummyhash"
    )
    
    assert result["status"] == "failed"
    assert "Could not connect to Neo4j" in result["errors"]

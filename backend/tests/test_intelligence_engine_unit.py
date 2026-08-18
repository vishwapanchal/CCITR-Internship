import pytest
import json
from unittest.mock import patch, MagicMock
from app.engines.intelligence import llm_client, threat_reasoner, copilot_rag

# ── LLM Client Tests ─────────────────────────────────────────

@patch("app.engines.intelligence.llm_client.httpx.Client")
def test_llm_generate_success(mock_client):
    """Test standard LLM generation via Ollama."""
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"response": "Mocked LLM Response", "eval_count": 10}
    mock_client.return_value.__enter__.return_value.post.return_value = mock_resp
    
    result = llm_client.generate("Test prompt")
    
    assert result == "Mocked LLM Response"

@patch("app.engines.intelligence.llm_client.httpx.Client")
def test_llm_generate_timeout(mock_client):
    """Test LLM client handles timeouts gracefully."""
    import httpx
    mock_client.return_value.__enter__.return_value.post.side_effect = httpx.TimeoutException("Timeout")
    
    result = llm_client.generate("Test prompt")
    
    assert "ERROR: LLM request timed out" in result


# ── Threat Reasoner Tests ────────────────────────────────────

@patch("app.engines.intelligence.threat_reasoner.llm_client.check_health")
@patch("app.engines.intelligence.threat_reasoner.llm_client.generate")
def test_threat_reasoner_with_llm(mock_generate, mock_health, tmp_path):
    """Test threat narrative generation when LLM is available."""
    mock_health.return_value = {"coder_ready": True}
    mock_generate.return_value = "This is a comprehensive threat narrative."
    
    # Setup dummy case reports
    case_dir = tmp_path / "case_test"
    
    static_dir = case_dir / "static_analysis"
    static_dir.mkdir(parents=True)
    with open(static_dir / "static_report.json", "w") as f:
        json.dump({"risk_score": 90, "steps": {}}, f)
        
    c2_dir = case_dir / "c2_intelligence"
    c2_dir.mkdir(parents=True)
    with open(c2_dir / "c2_report.json", "w") as f:
        json.dump({"steps": {"attribution": {"attribution_confidence": "high"}}}, f)
    
    result = threat_reasoner.generate_threat_narrative(str(case_dir))
    
    assert result["status"] == "success"
    assert result["narrative_text"] == "This is a comprehensive threat narrative."
    
    # Verify the LLM summary passed to the model condensed the data
    assert result["raw_summary_used"]["static"]["risk_score"] == 90
    assert result["raw_summary_used"]["c2"]["attribution_confidence"] == "high"


@patch("app.engines.intelligence.threat_reasoner.llm_client.check_health")
def test_threat_reasoner_no_llm(mock_health, tmp_path):
    """Test threat narrative generation fallback when LLM is unavailable."""
    mock_health.return_value = {"coder_ready": False}
    
    case_dir = tmp_path / "case_test2"
    static_dir = case_dir / "static_analysis"
    static_dir.mkdir(parents=True)
    with open(static_dir / "static_report.json", "w") as f:
        json.dump({"risk_score": 90}, f)
        
    result = threat_reasoner.generate_threat_narrative(str(case_dir))
    
    assert result["status"] == "success"
    assert "LLM not available" in result["narrative_text"]


# ── Co-Pilot RAG Tests ───────────────────────────────────────

@patch("app.engines.intelligence.copilot_rag._get_chroma_client")
def test_copilot_rag_indexing(mock_get_client, tmp_path):
    """Test that RAG correctly chunks and indexes reports."""
    mock_client = MagicMock()
    mock_collection = MagicMock()
    mock_client.get_or_create_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client
    
    case_dir = tmp_path / "case_rag"
    
    # Create fake reports
    static_dir = case_dir / "static_analysis"
    static_dir.mkdir(parents=True)
    with open(static_dir / "static_report.json", "w") as f:
        json.dump({"fake_data": "Lots of fake data here to test chunking " * 50}, f)
        
    # Index
    success = copilot_rag.index_case_artifacts("case_123", str(case_dir))
    
    assert success is True
    mock_collection.upsert.assert_called()

@patch("app.engines.intelligence.copilot_rag._get_chroma_client")
def test_copilot_rag_retrieval(mock_get_client):
    """Test RAG context retrieval."""
    mock_client = MagicMock()
    mock_collection = MagicMock()
    
    # Mock ChromaDB returning a relevant chunk
    mock_collection.query.return_value = {
        "documents": [["Relevant chunk from static analysis"]]
    }
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client
    
    context = copilot_rag.retrieve_context("case_123", "What is the threat?")
    
    assert context == "Relevant chunk from static analysis"

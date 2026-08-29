"""
Tests the consolidated risk-scoring logic that combines dropper-detection
events (parent-child payload tracking) with PCAP-derived network indicators,
as produced by device_monitor.py's manual pentest session.
"""

from app.engines.dynamic.heuristic_analyzer import compute_heuristic_risk


def _dropper_event(package_name="com.evil.dropper"):
    return {
        "api_call": f"CHILD_APK_INSTALLED: {package_name}",
        "description": f"Dropper detected: parent APK silently installed child package '{package_name}'",
        "category": "dropper",
        "risk_level": "CRITICAL",
    }


def _network_indicator_event(indicator_type, severity, category):
    return {
        "api_call": f"NETWORK_INDICATOR: {indicator_type}",
        "description": f"synthetic {indicator_type} indicator",
        "category": category,
        "risk_level": severity.upper(),
    }


def test_dropper_and_beaconing_events_combine_into_high_risk():
    events = [
        _dropper_event(),
        _network_indicator_event("periodic_beaconing", "critical", "network"),
    ]

    result = compute_heuristic_risk(events)

    assert result["risk_score"] > 0
    assert result["behaviors"]["c2_communication"] is True
    assert result["risk_breakdown"]["dropper"] == 15
    assert result["risk_breakdown"]["network"] == 15


def test_exfiltration_indicator_sets_data_exfiltration_flag():
    events = [_network_indicator_event("exfiltration_pattern", "high", "data_exfil")]

    result = compute_heuristic_risk(events)

    assert result["behaviors"]["data_exfiltration"] is True


def test_large_transfer_alone_does_not_imply_c2_without_high_severity():
    # A single LOW severity network event should not flag c2_communication.
    events = [_network_indicator_event("large_data_transfer", "low", "network")]

    result = compute_heuristic_risk(events)

    assert result["behaviors"]["c2_communication"] is False


def test_no_events_produces_zero_risk():
    result = compute_heuristic_risk([])
    assert result["risk_score"] == 0
    assert result["risk_level"] == "low"
    assert all(v is False for v in result["behaviors"].values())


def test_risk_level_thresholds():
    critical_events = [_dropper_event(f"com.evil.{i}") for i in range(7)]  # 7 * 15 = 105 -> capped 100
    result = compute_heuristic_risk(critical_events)
    assert result["risk_score"] == 100
    assert result["risk_level"] == "critical"

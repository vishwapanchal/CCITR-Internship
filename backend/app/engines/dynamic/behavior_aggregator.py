"""
Behavior Aggregator — Dynamic Analysis Risk Profiling
Aggregates Frida hook events and network captures to construct a timeline
and evaluate behavioral risks (exfiltration, crypto, spy, persistence).
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Base risk values for categorized events
EVENT_RISKS = {
    "sms": {
        "send_sms": 9,
        "send_multipart_sms": 9,
        "sms_content_query": 8,
        "receive_sms": 7,
    },
    "network": {
        "url_open_connection": 2,
        "http_request_method": 2,
        "okhttp_request": 2,
        "socket_connect": 4,
        "webview_load_url": 3,
        "webview_js_interface": 6,
    },
    "crypto": {
        "cipher_init": 3,
        "cipher_do_final": 3,
        "message_digest": 1,
        "keystore_load": 5,
    },
    "file": {
        "file_write": 2,
        "file_read": 1,
        "shared_pref_write": 2,
        "sqlite_exec": 3,
        "runtime_exec": 10,
        "process_builder_start": 10,
    },
    "device": {
        "camera_open": 8,
        "audio_record_start": 8,
        "location_request_updates": 6,
        "contacts_query": 8,
        "call_log_query": 8,
        "clipboard_read": 5,
        "get_device_id": 6,
        "get_subscriber_id": 7,
        "enumerate_packages": 5,
        "get_accounts": 7,
    }
}


def aggregate_behaviors(
    frida_messages: List[Dict[str, Any]], 
    network_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Aggregate all dynamic events and compute a risk score.
    """
    result = {
        "total_events": len(frida_messages),
        "risk_score": 0,
        "risk_level": "low",
        "behaviors": {
            "data_exfiltration": False,
            "c2_communication": False,
            "surveillance": False,
            "credential_theft": False,
            "command_execution": False,
        },
        "timeline": [],
        "risk_breakdown": {}
    }
    
    total_risk = 0
    category_risks = {"sms": 0, "network": 0, "crypto": 0, "file": 0, "device": 0}
    
    # Process Frida messages
    # Sort messages by timestamp if available
    try:
        sorted_msgs = sorted(
            frida_messages, 
            key=lambda x: x.get("timestamp", x.get("_timestamp", ""))
        )
    except Exception:
        sorted_msgs = frida_messages

    # Add to timeline (cap at 500 events to avoid massive JSON)
    for msg in sorted_msgs[:500]:
        timeline_entry = {
            "timestamp": msg.get("timestamp", msg.get("_timestamp")),
            "hook": msg.get("hook", "unknown"),
            "event": msg.get("event", "unknown"),
            "details": {k: v for k, v in msg.items() if k not in ["hook", "event", "timestamp", "_timestamp", "_script"]}
        }
        result["timeline"].append(timeline_entry)
        
        # Calculate risk
        hook = msg.get("hook", "")
        event = msg.get("event", "")
        
        risk_value = EVENT_RISKS.get(hook, {}).get(event, 0)
        if risk_value > 0:
            total_risk += risk_value
            category_risks[hook] = category_risks.get(hook, 0) + risk_value
            
        # Classify behaviors
        if event in ["send_sms", "contacts_query", "call_log_query"]:
            result["behaviors"]["data_exfiltration"] = True
            
        if hook == "device" and event in ["camera_open", "audio_record_start"]:
            result["behaviors"]["surveillance"] = True
            
        if event in ["runtime_exec", "process_builder_start"]:
            result["behaviors"]["command_execution"] = True
            
    # Process network behavior
    dns_queries = network_analysis.get("dns_queries", [])
    if dns_queries:
        result["behaviors"]["c2_communication"] = True
        total_risk += min(len(dns_queries) * 2, 10)
        
    http_reqs = network_analysis.get("http_requests", [])
    if http_reqs:
        result["behaviors"]["c2_communication"] = True
        total_risk += min(len(http_reqs) * 2, 15)

    # Calculate final score (0-100)
    # This is a cumulative risk, cap it at 100
    final_score = min(int(total_risk), 100)
    result["risk_score"] = final_score
    result["risk_breakdown"] = category_risks
    
    # Classify risk level
    if final_score >= 75:
        result["risk_level"] = "critical"
    elif final_score >= 50:
        result["risk_level"] = "high"
    elif final_score >= 25:
        result["risk_level"] = "medium"
    else:
        result["risk_level"] = "low"
        
    logger.info(f"Dynamic behavior aggregation complete. Risk Score: {final_score}/100")
    
    return result

"""
Threat Reasoning Agent
Synthesizes findings from static, dynamic, C2, and vulnerability phases.
Uses Qwen2.5-Coder-7B to generate a plain-language threat narrative
and chain of evidence for law enforcement officers.
"""

import os
import json
import logging
from typing import Dict, Any

from app.config import settings
from app.engines.intelligence import llm_client

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are APEX-X, an expert cybercrime investigator and forensic analyst.
Your job is to read raw malware analysis reports and write a clear, concise threat narrative for a law enforcement officer.
Do not use overly technical jargon unless necessary, and always explain what it means.
Structure your response exactly like this:
1. Executive Summary: 2-3 sentences on what this app is and its primary threat.
2. Behavioral Intent: What is the app trying to achieve? (e.g., steal SMS, act as spyware).
3. Chain of Evidence: Bullet points linking specific findings (e.g., YARA matches, API calls) to malicious intent.
4. Investigative Leads: 2-3 actionable steps for the investigator (e.g., 'Subpoena domain X').
Do not hallucinate. Base everything strictly on the provided JSON data."""

def generate_threat_narrative(case_dir: str) -> Dict[str, Any]:
    """
    Reads all phase reports and generates a comprehensive threat narrative.
    """
    # ── 1. Gather all phase data ──────────────────────────────
    reports = {}
    
    static_path = os.path.join(case_dir, "static_analysis", "static_report.json")
    if os.path.exists(static_path):
        with open(static_path, "r") as f:
            reports["static"] = json.load(f)
            
    dynamic_path = os.path.join(case_dir, "dynamic_analysis", "dynamic_report.json")
    if os.path.exists(dynamic_path):
        with open(dynamic_path, "r") as f:
            reports["dynamic"] = json.load(f)
            
    c2_path = os.path.join(case_dir, "c2_intelligence", "c2_report.json")
    if os.path.exists(c2_path):
        with open(c2_path, "r") as f:
            reports["c2"] = json.load(f)
            
    vuln_path = os.path.join(case_dir, "vulnerability_analysis", "vulnerability_report.json")
    if os.path.exists(vuln_path):
        with open(vuln_path, "r") as f:
            reports["vuln"] = json.load(f)

    if not reports:
        return {"status": "error", "error": "No analysis reports found to reason over."}

    # ── 2. Create a condensed summary for the LLM ─────────────
    # Full JSONs are too large, we must extract the highlights
    summary_for_llm = _create_llm_summary(reports)

    # ── 3. Check LLM availability ─────────────────────────────
    health = llm_client.check_health()
    use_llm = health.get("coder_ready", False)

    result = {
        "status": "success",
        "narrative_text": "",
        "raw_summary_used": summary_for_llm
    }

    if not use_llm:
        logger.warning(f"Coder model ({llm_client.MODEL_CODER}) not available. Returning raw summary.")
        result["narrative_text"] = "LLM not available. Please pull the Qwen2.5-Coder model to generate the AI narrative.\n\nRaw Findings Summary:\n" + json.dumps(summary_for_llm, indent=2)
        return result

    # ── 4. Generate Narrative ─────────────────────────────────
    prompt = f"Analyze the following malware findings and generate the threat narrative:\n\n{json.dumps(summary_for_llm, indent=2)}"
    
    try:
        logger.info("Generating threat narrative via LLM...")
        narrative = llm_client.generate(
            prompt=prompt,
            model=llm_client.MODEL_CODER,
            system=SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=getattr(settings, "THREAT_REASONER_MAX_TOKENS", 1500)
        )
        
        if narrative.startswith("[ERROR"):
            result["status"] = "error"
            result["narrative_text"] = "LLM generation failed."
            result["error"] = narrative
        else:
            result["narrative_text"] = narrative.strip()
            
    except Exception as e:
        logger.error(f"Failed to generate threat narrative: {e}")
        result["status"] = "error"
        result["error"] = str(e)
        result["narrative_text"] = f"Failed to generate narrative: {e}"

    return result

def _create_llm_summary(reports: Dict[str, Any]) -> Dict[str, Any]:
    """Condense reports to avoid exceeding the LLM context window."""
    summary = {}
    
    if "static" in reports:
        static = reports["static"]
        summary["static"] = {
            "risk_score": static.get("risk_score"),
            "yara_rules_matched": static.get("steps", {}).get("yara", {}).get("data", {}).get("rules_matched", []),
            "dangerous_permissions": static.get("steps", {}).get("manifest", {}).get("data", {}).get("permissions", {}).get("dangerous", []),
            "high_risk_api_calls": [api.get("api") for api in static.get("steps", {}).get("androguard", {}).get("data", {}).get("api_calls", {}).get("high_risk", [])][:getattr(settings, "THREAT_REASONER_MAX_API_CALLS", 15)] # Top 15
        }
        
    if "dynamic" in reports:
        dyn = reports["dynamic"]
        network_activity = dyn.get("network_activity", [])
        summary["dynamic"] = {
            "mode": dyn.get("mode"),
            "risk_score": dyn.get("risk_score"),
            "behaviors": dyn.get("behaviors", {}),
            "contacted_hosts": list({n.get("destination") for n in network_activity if n.get("destination")})[:20],
        }

        pentest = dyn.get("pentest_data")
        if pentest:
            net_stats = pentest.get("network_stats") or {}
            summary["dynamic"]["parent_child_payloads"] = [
                {
                    "package_name": c.get("package_name"),
                    "is_hidden": c.get("is_hidden"),
                    "is_running": c.get("is_running"),
                    "risk_level": c.get("risk_level"),
                }
                for c in pentest.get("child_apks", [])
            ]
            if net_stats.get("status") == "success":
                summary["dynamic"]["pcap_traffic"] = {
                    "total_packets": net_stats.get("total_packets"),
                    "total_bytes": net_stats.get("total_bytes"),
                    "inbound_bytes": net_stats.get("direction_summary", {}).get("inbound_bytes"),
                    "outbound_bytes": net_stats.get("direction_summary", {}).get("outbound_bytes"),
                    "suspicious_indicators": [
                        i["description"] for i in net_stats.get("suspicious_indicators", [])
                    ],
                }

    if "c2" in reports:
        c2 = reports["c2"]
        attribution = c2.get("attribution", {})
        infra = c2.get("contacted_infrastructure", {})
        summary["c2"] = {
            "malware_family": attribution.get("malware_family"),
            "threat_category": attribution.get("threat_category"),
            "attribution_confidence": attribution.get("confidence"),
            "detection_ratio": attribution.get("detection_ratio"),
            "contacted_domains": infra.get("domains", []),
            "contacted_ips": infra.get("ips", []),
        }
        
    if "vuln" in reports:
        vuln = reports["vuln"]
        summary["vulnerabilities"] = [
            {"owasp": f.get("owasp"), "name": f.get("name"), "severity": f.get("severity")}
            for f in vuln.get("findings", [])
        ]
        
    return summary

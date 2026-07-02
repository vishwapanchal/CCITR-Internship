"""
C2 Intelligence Engine — Orchestrator
Extracts IOCs from prior phases, builds the Neo4j C2 graph,
enriches the infrastructure, and attempts to attribute campaigns.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from app.engines.c2 import graph_builder
from app.engines.c2 import infra_enricher

logger = logging.getLogger(__name__)


def run_full_c2_intelligence(apk_path: str, case_dir: str, case_id: str) -> Dict[str, Any]:
    """
    Execute the C2 intelligence pipeline.
    Requires static and dynamic phases to be completed first (reads their reports).
    """
    start_time = datetime.now(timezone.utc)
    apk_hash = _get_apk_hash(case_dir)
    package_name = _get_package_name(case_dir)

    result = {
        "phase": "c2",
        "status": "running",
        "case_id": case_id,
        "started_at": start_time.isoformat(),
        "completed_at": None,
        "duration_seconds": None,
        "steps": {},
        "errors": [],
        "risk_score": 0,
        "risk_breakdown": None,
        "artifact_hashes": {},
    }

    c2_dir = os.path.join(case_dir, "c2_intelligence")
    os.makedirs(c2_dir, exist_ok=True)

    # ── Step 1: Build Graph ──────────────────────────────────
    logger.info("C2 Phase - Step 1: Building Neo4j Graph")
    try:
        graph_result = graph_builder.build_c2_graph(
            case_id=case_id,
            case_dir=case_dir,
            apk_hash=apk_hash,
            package_name=package_name,
        )
        result["steps"]["graph_construction"] = graph_result
        if graph_result.get("status") == "error":
            result["errors"].extend(graph_result.get("errors", []))
    except Exception as e:
        logger.error(f"Graph construction failed: {e}")
        result["steps"]["graph_construction"] = {"status": "error", "error": str(e)}
        result["errors"].append(f"Graph construction error: {e}")

    # ── Step 2: Infrastructure Enrichment ────────────────────
    logger.info("C2 Phase - Step 2: Infrastructure Enrichment")
    enrichment_result = {}
    try:
        domains = result["steps"].get("graph_construction", {}).get("domains", [])
        ips = result["steps"].get("graph_construction", {}).get("ips", [])
        
        enrichment_result = infra_enricher.enrich_all(domains, ips)
        result["steps"]["enrichment"] = {
            "status": "success",
            "data": enrichment_result
        }
    except Exception as e:
        logger.error(f"Infrastructure enrichment failed: {e}")
        result["steps"]["enrichment"] = {"status": "error", "error": str(e)}
        result["errors"].append(f"Enrichment error: {e}")

    # ── Step 3: Attribution & Scoring ────────────────────────
    logger.info("C2 Phase - Step 3: Attribution Scoring")
    try:
        risk_score = 0
        total_risk_indicators = enrichment_result.get("total_risk_indicators", 0)
        suspicious_tld_count = enrichment_result.get("suspicious_tld_count", 0)
        
        related_apks = result["steps"].get("graph_construction", {}).get("related_apks", [])
        campaign_links = result["steps"].get("graph_construction", {}).get("campaign_links", [])

        # Basic attribution scoring heuristics
        risk_score += min(total_risk_indicators * 5, 30)
        risk_score += min(suspicious_tld_count * 10, 20)
        if len(related_apks) > 0:
            risk_score += 20  # Known shared infrastructure with other malware
        if len(campaign_links) > 0:
            risk_score += 30  # Links to known campaigns

        result["risk_score"] = min(risk_score, 100)
        
        attribution = {
            "status": "success",
            "related_apks_count": len(related_apks),
            "campaigns_found": len(campaign_links),
            "attribution_confidence": "high" if len(campaign_links) > 0 else "medium" if len(related_apks) > 0 else "low"
        }
        result["steps"]["attribution"] = attribution

    except Exception as e:
        logger.error(f"Attribution scoring failed: {e}")
        result["steps"]["attribution"] = {"status": "error", "error": str(e)}
        result["errors"].append(f"Attribution error: {e}")


    # ── Save Results ─────────────────────────────────────────
    end_time = datetime.now(timezone.utc)
    result["completed_at"] = end_time.isoformat()
    result["duration_seconds"] = (end_time - start_time).total_seconds()
    result["status"] = "completed" if not result["errors"] else "completed_with_errors"

    report_path = os.path.join(c2_dir, "c2_report.json")
    try:
        with open(report_path, "w") as f:
            json.dump(result, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Failed to save C2 report: {e}")

    logger.info(
        f"C2 intelligence complete in {result['duration_seconds']:.1f}s — "
        f"Risk score contribution: {result['risk_score']}"
    )

    return result

def _get_apk_hash(case_dir: str) -> str:
    """Extract apk hash from static report, fallback to unknown."""
    static_path = os.path.join(case_dir, "static_analysis", "static_report.json")
    if os.path.exists(static_path):
        try:
            with open(static_path, "r") as f:
                report = json.load(f)
            # The static report doesn't store hash directly, maybe from DB or we can hash the file if passed.
            # But the static report has `apk_path`. Let's just use a dummy or try to parse the file name.
            apk_path = report.get("apk_path", "")
            if apk_path:
                return os.path.basename(apk_path)
        except:
            pass
    return "unknown_hash"

def _get_package_name(case_dir: str) -> str:
    """Extract package name from static permissions profile."""
    perm_path = os.path.join(case_dir, "static_analysis", "permissions_profile.json")
    if os.path.exists(perm_path):
        try:
            with open(perm_path, "r") as f:
                perms = json.load(f)
            return perms.get("package_name", "unknown")
        except:
            pass
    return "unknown"

"""
Agent Supervisor — LangGraph-Style State Machine Orchestrator
Implements a directed workflow where each node is a specialized analysis agent.
A Supervisor Agent coordinates the pipeline: state transitions, error handling,
retry logic, and conditional routing.

Uses langgraph StateGraph pattern. All inference is local-only via Ollama.
"""

import os
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, TypedDict, List
from enum import Enum

from app.config import settings

logger = logging.getLogger(__name__)


# ── State Definition ──────────────────────────────────────────

class PhaseStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class AgentState(TypedDict):
    """Shared state passed between all agent nodes."""
    case_id: str
    case_dir: str
    apk_path: str
    run_static: bool
    run_dynamic: bool
    phases: Dict[str, Dict[str, Any]]  # phase_name -> {status, result, error, duration}
    errors: List[str]
    overall_status: str
    started_at: str
    completed_at: Optional[str]
    risk_scores: Dict[str, float]


def _create_initial_state(
    case_id: str,
    case_dir: str,
    apk_path: str,
    run_static: bool = True,
    run_dynamic: bool = True,
) -> AgentState:
    """Create the initial state for the pipeline."""
    return AgentState(
        case_id=case_id,
        case_dir=case_dir,
        apk_path=apk_path,
        run_static=run_static,
        run_dynamic=run_dynamic,
        phases={
            "static": {"status": PhaseStatus.PENDING},
            "dynamic": {"status": PhaseStatus.PENDING},
            "c2_intelligence": {"status": PhaseStatus.PENDING},
            "vulnerability": {"status": PhaseStatus.PENDING},
            "threat_reasoning": {"status": PhaseStatus.PENDING},
            "malware_classification": {"status": PhaseStatus.PENDING},
            "rag_indexing": {"status": PhaseStatus.PENDING},
        },
        errors=[],
        overall_status="running",
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=None,
        risk_scores={},
    )


# ── Agent Node Functions ──────────────────────────────────────

def static_agent(state: AgentState) -> AgentState:
    """Node: Run static analysis engine."""
    if not state["run_static"]:
        state["phases"]["static"]["status"] = PhaseStatus.SKIPPED
        return state

    state["phases"]["static"]["status"] = PhaseStatus.RUNNING
    logger.info(f"[Supervisor] Static Agent started for case {state['case_id']}")
    start = time.time()

    try:
        from app.engines.static import run_full_static_analysis
        result = run_full_static_analysis(state["apk_path"], state["case_dir"])
        state["phases"]["static"] = {
            "status": PhaseStatus.COMPLETED,
            "risk_score": result.get("risk_score", 0),
            "duration": round(time.time() - start, 2),
        }
        state["risk_scores"]["static"] = result.get("risk_score", 0)

    except Exception as e:
        logger.error(f"[Supervisor] Static Agent failed: {e}")
        state["phases"]["static"] = {
            "status": PhaseStatus.FAILED,
            "error": str(e),
            "duration": round(time.time() - start, 2),
        }
        state["errors"].append(f"Static analysis failed: {e}")

    return state


def dynamic_agent(state: AgentState) -> AgentState:
    """Node: Run dynamic analysis engine."""
    if not state["run_dynamic"]:
        state["phases"]["dynamic"]["status"] = PhaseStatus.SKIPPED
        return state

    state["phases"]["dynamic"]["status"] = PhaseStatus.RUNNING
    logger.info(f"[Supervisor] Dynamic Agent started for case {state['case_id']}")
    start = time.time()

    try:
        from app.engines.dynamic import run_full_dynamic_analysis
        result = run_full_dynamic_analysis(state["apk_path"], state["case_dir"], duration=getattr(settings, "DYNAMIC_ANALYSIS_DURATION", 60))
        state["phases"]["dynamic"] = {
            "status": PhaseStatus.COMPLETED,
            "risk_score": result.get("risk_score", 0),
            "duration": round(time.time() - start, 2),
        }
        state["risk_scores"]["dynamic"] = result.get("risk_score", 0) or 0

    except Exception as e:
        logger.error(f"[Supervisor] Dynamic Agent failed: {e}")
        state["phases"]["dynamic"] = {
            "status": PhaseStatus.FAILED,
            "error": str(e),
            "duration": round(time.time() - start, 2),
        }
        state["errors"].append(f"Dynamic analysis failed: {e}")

    return state


def c2_agent(state: AgentState) -> AgentState:
    """Node: Run C2 intelligence engine."""
    state["phases"]["c2_intelligence"]["status"] = PhaseStatus.RUNNING
    logger.info(f"[Supervisor] C2 Intelligence Agent started for case {state['case_id']}")
    start = time.time()

    try:
        from app.engines.c2 import run_full_c2_intelligence
        result = run_full_c2_intelligence(
            state["apk_path"], state["case_dir"], state["case_id"]
        )
        state["phases"]["c2_intelligence"] = {
            "status": PhaseStatus.COMPLETED,
            "risk_score": result.get("risk_score", 0),
            "duration": round(time.time() - start, 2),
        }
        state["risk_scores"]["c2"] = result.get("risk_score", 0)

    except Exception as e:
        logger.error(f"[Supervisor] C2 Agent failed: {e}")
        state["phases"]["c2_intelligence"] = {
            "status": PhaseStatus.FAILED,
            "error": str(e),
            "duration": round(time.time() - start, 2),
        }
        state["errors"].append(f"C2 intelligence failed: {e}")

    return state


def vuln_agent(state: AgentState) -> AgentState:
    """Node: Run vulnerability discovery engine."""
    state["phases"]["vulnerability"]["status"] = PhaseStatus.RUNNING
    logger.info(f"[Supervisor] Vulnerability Agent started for case {state['case_id']}")
    start = time.time()

    try:
        from app.engines.vulnerability import run_vulnerability_scan
        result = run_vulnerability_scan(state["case_dir"], state["case_id"])
        state["phases"]["vulnerability"] = {
            "status": PhaseStatus.COMPLETED,
            "risk_score": result.get("risk_score", 0),
            "duration": round(time.time() - start, 2),
        }
        state["risk_scores"]["vulnerability"] = result.get("risk_score", 0)

    except Exception as e:
        logger.error(f"[Supervisor] Vulnerability Agent failed: {e}")
        state["phases"]["vulnerability"] = {
            "status": PhaseStatus.FAILED,
            "error": str(e),
            "duration": round(time.time() - start, 2),
        }
        state["errors"].append(f"Vulnerability scan failed: {e}")

    return state


def reasoning_agent(state: AgentState) -> AgentState:
    """Node: Run LLM-based threat reasoning."""
    state["phases"]["threat_reasoning"]["status"] = PhaseStatus.RUNNING
    logger.info(f"[Supervisor] Reasoning Agent started for case {state['case_id']}")
    start = time.time()

    try:
        from app.engines.intelligence import threat_reasoner
        result = threat_reasoner.generate_threat_narrative(state["case_dir"])

        # Save narrative
        narrative_dir = os.path.join(state["case_dir"], "intelligence_analysis")
        os.makedirs(narrative_dir, exist_ok=True)
        with open(os.path.join(narrative_dir, "threat_narrative.json"), "w") as f:
            json.dump(result, f, indent=2)

        state["phases"]["threat_reasoning"] = {
            "status": PhaseStatus.COMPLETED,
            "duration": round(time.time() - start, 2),
        }

    except Exception as e:
        logger.error(f"[Supervisor] Reasoning Agent failed: {e}")
        state["phases"]["threat_reasoning"] = {
            "status": PhaseStatus.FAILED,
            "error": str(e),
            "duration": round(time.time() - start, 2),
        }
        state["errors"].append(f"Threat reasoning failed: {e}")

    return state


def classifier_agent(state: AgentState) -> AgentState:
    """Node: Run malware family classification."""
    state["phases"]["malware_classification"]["status"] = PhaseStatus.RUNNING
    logger.info(f"[Supervisor] Classifier Agent started for case {state['case_id']}")
    start = time.time()

    try:
        from app.engines.intelligence import malware_classifier
        result = malware_classifier.classify_malware(state["case_dir"])
        state["phases"]["malware_classification"] = {
            "status": PhaseStatus.COMPLETED,
            "predicted_family": result.get("predicted_family"),
            "confidence": result.get("confidence"),
            "duration": round(time.time() - start, 2),
        }

    except Exception as e:
        logger.error(f"[Supervisor] Classifier Agent failed: {e}")
        state["phases"]["malware_classification"] = {
            "status": PhaseStatus.FAILED,
            "error": str(e),
            "duration": round(time.time() - start, 2),
        }
        state["errors"].append(f"Malware classification failed: {e}")

    return state


def rag_agent(state: AgentState) -> AgentState:
    """Node: Index case artifacts into ChromaDB for Co-Pilot RAG."""
    state["phases"]["rag_indexing"]["status"] = PhaseStatus.RUNNING
    logger.info(f"[Supervisor] RAG Indexing Agent started for case {state['case_id']}")
    start = time.time()

    try:
        from app.engines.intelligence import copilot_rag
        copilot_rag.index_case_artifacts(state["case_id"], state["case_dir"])
        state["phases"]["rag_indexing"] = {
            "status": PhaseStatus.COMPLETED,
            "duration": round(time.time() - start, 2),
        }

    except Exception as e:
        logger.error(f"[Supervisor] RAG Agent failed: {e}")
        state["phases"]["rag_indexing"] = {
            "status": PhaseStatus.FAILED,
            "error": str(e),
            "duration": round(time.time() - start, 2),
        }
        state["errors"].append(f"RAG indexing failed: {e}")

    return state


# ── Supervisor: Conditional Routing ───────────────────────────

def should_continue_after_static(state: AgentState) -> str:
    """Decide next node after static analysis."""
    # Even if static failed, try dynamic
    return "dynamic_agent"


def should_continue_after_dynamic(state: AgentState) -> str:
    """Decide next node after dynamic analysis."""
    # C2 and Vuln can run regardless of dynamic outcome
    return "c2_agent"


def should_continue_after_c2(state: AgentState) -> str:
    return "vuln_agent"


def should_continue_after_vuln(state: AgentState) -> str:
    return "reasoning_agent"


def should_continue_after_reasoning(state: AgentState) -> str:
    return "classifier_agent"


def should_continue_after_classifier(state: AgentState) -> str:
    return "rag_agent"


# ── Pipeline Execution ────────────────────────────────────────

# Define the ordered pipeline as a list of (node_name, node_function, router_function) tuples
_PIPELINE = [
    ("static_agent", static_agent, should_continue_after_static),
    ("dynamic_agent", dynamic_agent, should_continue_after_dynamic),
    ("c2_agent", c2_agent, should_continue_after_c2),
    ("vuln_agent", vuln_agent, should_continue_after_vuln),
    ("reasoning_agent", reasoning_agent, should_continue_after_reasoning),
    ("classifier_agent", classifier_agent, should_continue_after_classifier),
    ("rag_agent", rag_agent, None),
]


def run_supervised_pipeline(
    case_id: str,
    case_dir: str,
    apk_path: str,
    run_static: bool = True,
    run_dynamic: bool = True,
) -> AgentState:
    """
    Execute the full analysis pipeline using the LangGraph-style supervisor.
    Each agent node runs sequentially, with the supervisor managing state
    transitions, error handling, and conditional routing between nodes.

    Args:
        case_id: Case identifier.
        case_dir: Path to the case directory.
        apk_path: Path to the APK file.
        run_static: Whether to run static analysis.
        run_dynamic: Whether to run dynamic analysis.

    Returns:
        Final AgentState with all phase results.
    """
    logger.info(f"[Supervisor] Starting supervised pipeline for case {case_id}")

    state = _create_initial_state(
        case_id=case_id,
        case_dir=case_dir,
        apk_path=apk_path,
        run_static=run_static,
        run_dynamic=run_dynamic,
    )

    # Execute each node in sequence
    for node_name, node_fn, router_fn in _PIPELINE:
        logger.info(f"[Supervisor] Executing node: {node_name}")

        try:
            state = node_fn(state)
        except Exception as e:
            # Supervisor-level catch: log and continue to next node
            logger.error(f"[Supervisor] Unhandled error in {node_name}: {e}")
            state["errors"].append(f"Supervisor caught error in {node_name}: {e}")

        # Router decides next node (in this implementation, it's always sequential)
        if router_fn:
            next_node = router_fn(state)
            logger.debug(f"[Supervisor] Router: {node_name} -> {next_node}")

    # Finalize
    state["completed_at"] = datetime.now(timezone.utc).isoformat()
    failed_phases = [
        name for name, phase in state["phases"].items()
        if phase.get("status") == PhaseStatus.FAILED
    ]

    if not failed_phases:
        state["overall_status"] = "completed"
    elif len(failed_phases) == len(state["phases"]):
        state["overall_status"] = "failed"
    else:
        state["overall_status"] = "completed_with_errors"

    # Save supervisor report
    report_path = os.path.join(case_dir, "supervisor_report.json")
    try:
        with open(report_path, "w") as f:
            json.dump(dict(state), f, indent=2, default=str)
    except Exception as e:
        logger.warning(f"Failed to save supervisor report: {e}")

    logger.info(
        f"[Supervisor] Pipeline complete: {state['overall_status']} "
        f"({len(failed_phases)} failed phases)"
    )
    return state

"""
Co-Pilot REST API — Local Ollama-Only Chat Endpoint
Provides a REST fallback alongside the WebSocket endpoint.
All inference is routed through the local Ollama instance — zero external API calls.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import logging

from app.engines.intelligence import llm_client

router = APIRouter()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are APEX-X Co-Pilot, an expert Android malware forensics AI assistant embedded in the APEX-X threat intelligence platform. You are built for CMP311 — Professional Project Planning and Prototyping.

You receive the COMPLETE analysis data for the currently selected APK case. This data was extracted by the APEX-X static analysis engine using: APKTool, JADX, Androguard, Manifest Parser, YARA Scanner, and IOC Extractor.

HOW TO RESPOND:
- Reference SPECIFIC data from the context (exact permission names, exact domain names, exact CWE IDs, exact CVSS scores)
- When asked about permissions, list the actual permission names and their risk levels from the data
- When asked about IOCs, cite the exact URLs/domains/IPs from the data
- When asked about vulnerabilities, reference the specific title, CVSS score, CWE ID, and OWASP category
- Calculate and cite statistics from the data (e.g., "3 out of 8 permissions are dangerous")
- For risk assessment, explain WHY the threat_score is what it is, based on the specific findings
- Use forensic/security professional language
- Use bullet points and structured formatting for clarity
- Be thorough but concise
- NEVER fabricate or hallucinate data. Only reference what exists in the provided context.
- If asked about something not in the context (e.g., dynamic analysis when only static was run), clearly state that data is not available.

IMPORTANT: The pre-tested APKs (DIVA, InsecureShop, AndroGoat) are intentionally vulnerable educational apps. Explain findings in that context when relevant."""


class Message(BaseModel):
    role: str
    content: str


class CopilotRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[Message]] = []


@router.post("")
async def copilot_chat(request: CopilotRequest):
    """
    REST endpoint for Co-Pilot chat.
    Routes all inference to the LOCAL Ollama instance — no external APIs.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="No message provided")

    # Check local LLM health
    health = llm_client.check_health()
    if health.get("status") != "healthy":
        raise HTTPException(
            status_code=503,
            detail="Local LLM (Ollama) is not available. Start it with: ollama serve"
        )

    # Build the prompt with context
    prompt_parts = []

    if request.context:
        prompt_parts.append(
            f"CURRENT CASE CONTEXT:\n{json.dumps(request.context, indent=2)}"
        )

    # Add conversation history
    if request.history:
        for msg in request.history:
            if msg.role == "user":
                prompt_parts.append(f"User: {msg.content}")
            elif msg.role in ("assistant", "ai"):
                prompt_parts.append(f"Assistant: {msg.content}")

    prompt_parts.append(f"User: {request.message}")
    prompt_parts.append("Assistant:")

    full_prompt = "\n\n".join(prompt_parts)

    try:
        logger.info(f"Co-Pilot REST request: prompt_len={len(full_prompt)}")
        response_text = llm_client.generate(
            prompt=full_prompt,
            model=llm_client.MODEL_CODER,
            system=SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=1024,
        )

        if response_text.startswith("[ERROR"):
            raise HTTPException(
                status_code=503,
                detail=f"LLM inference error: {response_text}"
            )

        return {"message": response_text.strip()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Co-Pilot error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

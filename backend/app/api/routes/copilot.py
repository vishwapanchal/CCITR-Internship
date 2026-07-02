from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import httpx
import json

router = APIRouter()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-r1:free"

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
    if not request.message:
        raise HTTPException(status_code=400, detail="No message provided")
        
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured on backend")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if request.context:
        messages.append({
            "role": "system",
            "content": f"CURRENT CASE CONTEXT:\n{json.dumps(request.context, indent=2)}"
        })

    if request.history:
        for msg in request.history:
            if msg.role in ["user", "assistant"]:
                messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": request.message})

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://apex-x.onrender.com",
                    "X-Title": "APEX-X Co-Pilot"
                },
                json={
                    "model": MODEL,
                    "messages": messages,
                    "max_tokens": 1024,
                    "temperature": 0.3
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            ai_message = data.get("choices", [{}])[0].get("message", {}).get("content", "No response generated.")
            return {"message": ai_message}
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

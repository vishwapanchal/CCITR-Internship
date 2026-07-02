"""
LLM Client — Ollama HTTP API Wrapper
Provides a thread-safe, sequential-only interface to local Ollama models.
Enforces the 16GB RAM constraint: only one model loaded at a time.
"""

import json
import logging
import threading
import time
from typing import Optional, Dict, Any, Generator

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Model constants — match the exact Ollama model tags
MODEL_CODER = settings.OLLAMA_MODEL_CODER        # Qwen2.5-Coder-7B
MODEL_SECURITY = settings.OLLAMA_MODEL_SECURITY   # WhiteRabbitNeo-7B

# Sequential lock — only one LLM call at a time to prevent OOM
_llm_lock = threading.Lock()


def generate(
    prompt: str,
    model: str = MODEL_CODER,
    system: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    timeout: int = settings.OLLAMA_TIMEOUT,
) -> str:
    """
    Send a prompt to the local Ollama instance and return the full response.

    Args:
        prompt: The user prompt.
        model: Ollama model tag.
        system: Optional system prompt.
        temperature: Sampling temperature (lower = more deterministic).
        max_tokens: Maximum tokens to generate.
        timeout: Request timeout in seconds.

    Returns:
        The generated text response.
    """
    with _llm_lock:
        return _call_ollama(prompt, model, system, temperature, max_tokens, timeout)


def generate_streaming(
    prompt: str,
    model: str = MODEL_CODER,
    system: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    timeout: int = settings.OLLAMA_TIMEOUT,
) -> Generator[str, None, None]:
    """
    Stream tokens from Ollama. Yields each token as it arrives.
    Used by the Co-Pilot WebSocket for real-time chat.
    """
    with _llm_lock:
        yield from _call_ollama_stream(prompt, model, system, temperature, max_tokens, timeout)


def _call_ollama(
    prompt: str,
    model: str,
    system: Optional[str],
    temperature: float,
    max_tokens: int,
    timeout: int,
) -> str:
    """Internal: blocking call to Ollama /api/generate."""
    url = f"{settings.OLLAMA_HOST}/api/generate"

    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    if system:
        payload["system"] = system

    logger.info(f"LLM request: model={model}, prompt_len={len(prompt)}")
    start = time.time()

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        elapsed = time.time() - start
        response_text = data.get("response", "")
        logger.info(
            f"LLM response: model={model}, "
            f"tokens={data.get('eval_count', '?')}, "
            f"elapsed={elapsed:.1f}s"
        )
        return response_text

    except httpx.ConnectError:
        logger.error(
            f"Cannot connect to Ollama at {settings.OLLAMA_HOST}. "
            "Is the Ollama service running?"
        )
        return "[ERROR: Ollama service not available. Start it with: ollama serve]"

    except httpx.TimeoutException:
        logger.error(f"Ollama request timed out after {timeout}s")
        return "[ERROR: LLM request timed out. The model may still be loading.]"

    except Exception as e:
        logger.error(f"Ollama error: {e}")
        return f"[ERROR: {e}]"


def _call_ollama_stream(
    prompt: str,
    model: str,
    system: Optional[str],
    temperature: float,
    max_tokens: int,
    timeout: int,
) -> Generator[str, None, None]:
    """Internal: streaming call to Ollama /api/generate."""
    url = f"{settings.OLLAMA_HOST}/api/generate"

    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    if system:
        payload["system"] = system

    logger.info(f"LLM stream request: model={model}")

    try:
        with httpx.Client(timeout=timeout) as client:
            with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("response", "")
                            if token:
                                yield token
                            if chunk.get("done", False):
                                return
                        except json.JSONDecodeError:
                            continue

    except httpx.ConnectError:
        yield "[ERROR: Ollama service not available]"
    except httpx.TimeoutException:
        yield "[ERROR: LLM request timed out]"
    except Exception as e:
        yield f"[ERROR: {e}]"


def check_health() -> Dict[str, Any]:
    """Check if Ollama is running and which models are available."""
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{settings.OLLAMA_HOST}/api/tags")
            resp.raise_for_status()
            data = resp.json()

        models = [m["name"] for m in data.get("models", [])]
        return {
            "status": "healthy",
            "models_available": models,
            "coder_ready": any(MODEL_CODER in m for m in models),
            "security_ready": any(MODEL_SECURITY in m for m in models),
        }

    except Exception as e:
        return {"status": "unreachable", "error": str(e)}


def ensure_model_pulled(model: str) -> bool:
    """Check if a model is available locally, log a warning if not."""
    health = check_health()
    if health["status"] != "healthy":
        logger.warning(f"Ollama not reachable: {health.get('error')}")
        return False

    available = health.get("models_available", [])
    if any(model in m for m in available):
        return True

    logger.warning(
        f"Model '{model}' not found in Ollama. "
        f"Pull it with: ollama pull {model}"
    )
    return False

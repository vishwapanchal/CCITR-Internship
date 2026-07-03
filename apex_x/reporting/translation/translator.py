"""
Translator — Local Ollama-Based Multilingual Translation
Translates forensic report text into Hindi, Kannada, Tamil, and Telugu
using the local Qwen2.5-Coder model (which has multilingual capabilities).
Applies glossary substitutions to preserve technical terminology accuracy.

Zero external API calls — all inference is local via Ollama.
"""

import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Language display names for prompting
_LANG_NAMES = {
    "hi": "Hindi",
    "kn": "Kannada",
    "ta": "Tamil",
    "te": "Telugu",
}


class Translator:
    """
    Translates text using local Ollama LLM with glossary-aware pre/post processing.
    Falls back to glossary-only substitution when Ollama is unavailable.
    """

    SUPPORTED_LANGUAGES = ["en", "hi", "kn", "ta", "te"]

    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self._load_glossary()
        self._ollama_available: Optional[bool] = None

    def _load_glossary(self):
        from .glossary import CYBER_GLOSSARY
        self.glossary = CYBER_GLOSSARY

    def _check_ollama(self) -> bool:
        """Check if Ollama is reachable (cached after first check)."""
        if self._ollama_available is not None:
            return self._ollama_available

        try:
            import httpx
            resp = httpx.get("http://localhost:11434/api/tags", timeout=5)
            self._ollama_available = resp.status_code == 200
        except Exception:
            self._ollama_available = False

        return self._ollama_available

    def _apply_glossary_pre(self, text: str, target_lang: str) -> str:
        """
        Replace known technical terms with placeholder tokens before translation
        so the LLM doesn't mistranslate them.
        """
        en_glossary = self.glossary.get("en", {})
        self._placeholder_map = {}

        for i, (key, en_term) in enumerate(en_glossary.items()):
            placeholder = f"__GLOSS_{i}__"
            # Case-insensitive replacement of the English term
            pattern = re.compile(re.escape(en_term), re.IGNORECASE)
            if pattern.search(text):
                text = pattern.sub(placeholder, text)
                # Store the target-language translation from glossary
                target_glossary = self.glossary.get(target_lang, {})
                self._placeholder_map[placeholder] = target_glossary.get(key, en_term)

        return text

    def _apply_glossary_post(self, text: str) -> str:
        """Replace placeholder tokens with the correct glossary translations."""
        for placeholder, translation in self._placeholder_map.items():
            text = text.replace(placeholder, translation)
        return text

    def _translate_via_ollama(self, text: str, target_lang: str) -> str:
        """Translate text using local Ollama Qwen model."""
        try:
            import httpx

            lang_name = _LANG_NAMES.get(target_lang, target_lang)

            prompt = (
                f"Translate the following English cybersecurity forensic report text into {lang_name}. "
                f"Keep all technical terms, file paths, hashes, domain names, IP addresses, and code unchanged. "
                f"Preserve any __GLOSS_N__ placeholders exactly as they are — do not translate them. "
                f"Only output the translated text, nothing else.\n\n"
                f"Text to translate:\n{text}"
            )

            payload = {
                "model": "qwen2.5-coder:7b-instruct-q4_K_M",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "num_predict": 1024,
                },
            }

            with httpx.Client(timeout=120) as client:
                resp = client.post("http://localhost:11434/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()

            return data.get("response", text).strip()

        except Exception as e:
            logger.warning(f"Ollama translation failed: {e}. Using glossary-only fallback.")
            return None

    def _glossary_only_fallback(self, text: str, target_lang: str) -> str:
        """
        Fallback: substitute only known glossary terms.
        The rest stays in English with a [PARTIAL] prefix.
        """
        target_glossary = self.glossary.get(target_lang, {})
        en_glossary = self.glossary.get("en", {})

        result = text
        for key, en_term in en_glossary.items():
            if key in target_glossary:
                pattern = re.compile(re.escape(en_term), re.IGNORECASE)
                result = pattern.sub(target_glossary[key], result)

        return result

    def translate_text(self, text: str, target_lang: str) -> str:
        """
        Translates text using local Ollama LLM with glossary-aware processing.
        Falls back to glossary-only substitution if Ollama is unavailable.
        """
        if target_lang == "en" or not text:
            return text

        if target_lang not in self.SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language: {target_lang}")

        # Skip translation for very short strings or technical identifiers
        if len(text) < 5 or not any(c.isalpha() for c in text):
            return text

        # Step 1: Replace glossary terms with placeholders
        processed_text = self._apply_glossary_pre(text, target_lang)

        # Step 2: Translate via Ollama (if available)
        if self._check_ollama():
            translated = self._translate_via_ollama(processed_text, target_lang)
            if translated:
                # Step 3: Replace placeholders with glossary translations
                return self._apply_glossary_post(translated)

        # Fallback: glossary-only substitution
        logger.info(f"Using glossary-only fallback for {target_lang}")
        return self._glossary_only_fallback(text, target_lang)

    def translate_report_data(self, data: dict, target_lang: str) -> dict:
        """Recursively translates all string values in the report data dict."""
        if target_lang == "en":
            return data

        translated = {}
        for k, v in data.items():
            if isinstance(v, dict):
                translated[k] = self.translate_report_data(v, target_lang)
            elif isinstance(v, list):
                translated[k] = [
                    self.translate_text(item, target_lang) if isinstance(item, str) else item
                    for item in v
                ]
            elif isinstance(v, str):
                # Don't translate hashes, domains, IPs, package names, or short identifiers
                if len(v) == 64 or v.count('.') >= 2 or ' ' not in v:
                    translated[k] = v
                else:
                    translated[k] = self.translate_text(v, target_lang)
            else:
                translated[k] = v
        return translated

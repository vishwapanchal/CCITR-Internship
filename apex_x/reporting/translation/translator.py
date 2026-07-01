class Translator:
    """
    Stub for IndicTrans2 local translation pipeline.
    Ensures report generation doesn't rely on cloud APIs.
    """
    
    SUPPORTED_LANGUAGES = ["en", "hi", "kn", "ta", "te"]
    
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self._load_glossary()
        # Stub: model = IndicTrans2.load(model_path)
        
    def _load_glossary(self):
        from .glossary import CYBER_GLOSSARY
        self.glossary = CYBER_GLOSSARY
        
    def translate_text(self, text: str, target_lang: str) -> str:
        """
        Translates text using local models.
        Applies glossary substitutions before translation to ensure technical accuracy.
        """
        if target_lang == "en" or not text:
            return text
            
        if target_lang not in self.SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language: {target_lang}")
            
        # Stub: Return fake translation for testing
        return f"[{target_lang.upper()}] {text}"
        
    def translate_report_data(self, data: dict, target_lang: str) -> dict:
        """Recursively translates all string values in the report data dict."""
        if target_lang == "en":
            return data
            
        translated = {}
        for k, v in data.items():
            if isinstance(v, dict):
                translated[k] = self.translate_report_data(v, target_lang)
            elif isinstance(v, list):
                translated[k] = [self.translate_text(item, target_lang) if isinstance(item, str) else item for item in v]
            elif isinstance(v, str):
                # Don't translate hashes, domains, IPs, or package names
                if len(v) == 64 or v.count('.') >= 2 or ' ' not in v:
                    translated[k] = v
                else:
                    translated[k] = self.translate_text(v, target_lang)
            else:
                translated[k] = v
        return translated

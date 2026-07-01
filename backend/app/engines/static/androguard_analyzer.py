import os
from typing import Dict, Any, List

def analyze_apk(apk_path: str) -> Dict[str, Any]:
    """
    Mock wrapper for Androguard API.
    In a real scenario, this would use androguard.misc.AnalyzeAPK to extract permissions, APIs, etc.
    """
    if not os.path.exists(apk_path):
        return {}
        
    return {
        "package_name": "com.mock.malware",
        "app_name": "MockApp",
        "permissions": [
            "android.permission.INTERNET",
            "android.permission.READ_SMS",
            "android.permission.SEND_SMS"
        ],
        "api_calls": [
            "java.net.URL.openConnection",
            "android.telephony.SmsManager.sendTextMessage"
        ],
        "main_activity": "com.mock.malware.MainActivity",
        "activities": ["com.mock.malware.MainActivity"],
        "services": [],
        "receivers": [],
        "providers": []
    }

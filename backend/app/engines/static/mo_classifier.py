"""
Modus Operandi (MO) Classifier
Applies regex and heuristic rules over permissions, manifest configurations,
and API calls to tag the APK with known MOs (e.g., SMS_INTERCEPT, BANKING_OVERLAY).
"""

from typing import Dict, Any, List

def classify_mo(static_results: Dict[str, Any], androguard_data: Dict[str, Any]) -> List[str]:
    """
    Evaluates analysis results against known MO heuristics.
    Returns a list of MO tags.
    """
    mos = set()
    
    permissions = set(androguard_data.get("permissions", []))
    
    # Extract API calls
    api_calls = androguard_data.get("api_calls", {})
    high_risk_apis = []
    if isinstance(api_calls.get("high_risk"), list):
        for call in api_calls["high_risk"]:
            high_risk_apis.append(call.get("api", "") if isinstance(call, dict) else str(call))
            
    # MO 1: SMS Intercept & Forward
    if "android.permission.RECEIVE_SMS" in permissions or "android.permission.READ_SMS" in permissions:
        if "android.permission.SEND_SMS" in permissions or "android.permission.INTERNET" in permissions:
            mos.add("MO_SMS_INTERCEPT")
            
    # MO 2: Banking Overlay (Overlay + Accessibility + Network)
    if "android.permission.SYSTEM_ALERT_WINDOW" in permissions and "android.permission.BIND_ACCESSIBILITY_SERVICE" in permissions:
        mos.add("MO_BANKING_OVERLAY")
        
    # MO 3: Ransomware (WakeLock + BootCompleted + SystemAlertWindow)
    if "android.permission.WAKE_LOCK" in permissions and "android.permission.RECEIVE_BOOT_COMPLETED" in permissions:
        if "android.permission.SYSTEM_ALERT_WINDOW" in permissions:
            mos.add("MO_RANSOMWARE_LOCKER")
            
    # MO 4: Dynamic Payload Loading
    has_dex_load = any("DexClassLoader" in call for call in high_risk_apis)
    has_net = "android.permission.INTERNET" in permissions
    if has_dex_load and has_net:
        mos.add("MO_DYNAMIC_PAYLOAD_DOWNLOADER")
        
    # MO 5: RAT (Remote Access Trojan) -> Already checked via remote_access_detector but we can mirror it here
    remote_access = static_results.get("remote_access_abuse", {})
    if remote_access.get("flagged"):
        mos.add("MO_RAT_ABUSE")
        
    # MO 6: Evades Analysis (Emulator Detection)
    has_build_check = any("android/os/Build" in call for call in high_risk_apis)
    if has_build_check:
        mos.add("MO_EMULATOR_EVASION")
        
    return sorted(list(mos))

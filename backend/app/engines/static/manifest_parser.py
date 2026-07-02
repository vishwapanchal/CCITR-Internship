"""
AndroidManifest.xml Parser — Enhanced
Deep inspection of the Android manifest for permissions, components,
security misconfigurations, intent filters, and exported component analysis.
"""

import xml.etree.ElementTree as ET
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Android XML namespace
ANDROID_NS = "http://schemas.android.com/apk/res/android"
NS = {"android": ANDROID_NS}


# Comprehensive dangerous permission classification
DANGEROUS_PERMISSIONS = {
    # Location
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_BACKGROUND_LOCATION",
    # Camera & Microphone
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    # Contacts
    "android.permission.READ_CONTACTS",
    "android.permission.WRITE_CONTACTS",
    "android.permission.GET_ACCOUNTS",
    # Phone
    "android.permission.READ_PHONE_STATE",
    "android.permission.READ_PHONE_NUMBERS",
    "android.permission.CALL_PHONE",
    "android.permission.READ_CALL_LOG",
    "android.permission.WRITE_CALL_LOG",
    "android.permission.PROCESS_OUTGOING_CALLS",
    "android.permission.USE_SIP",
    "android.permission.ANSWER_PHONE_CALLS",
    # SMS
    "android.permission.SEND_SMS",
    "android.permission.RECEIVE_SMS",
    "android.permission.READ_SMS",
    "android.permission.RECEIVE_MMS",
    "android.permission.RECEIVE_WAP_PUSH",
    # Storage
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.MANAGE_EXTERNAL_STORAGE",
    # Calendar
    "android.permission.READ_CALENDAR",
    "android.permission.WRITE_CALENDAR",
    # Body Sensors
    "android.permission.BODY_SENSORS",
    "android.permission.ACTIVITY_RECOGNITION",
    # Bluetooth
    "android.permission.BLUETOOTH_CONNECT",
    "android.permission.BLUETOOTH_SCAN",
    "android.permission.BLUETOOTH_ADVERTISE",
    # Nearby
    "android.permission.NEARBY_WIFI_DEVICES",
    # Notifications
    "android.permission.POST_NOTIFICATIONS",
    # Media
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_MEDIA_AUDIO",
}

# Permissions that are especially suspicious for malware
MALWARE_INDICATOR_PERMISSIONS = {
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.BIND_ACCESSIBILITY_SERVICE",
    "android.permission.BIND_DEVICE_ADMIN",
    "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
    "android.permission.REQUEST_INSTALL_PACKAGES",
    "android.permission.READ_LOGS",
    "android.permission.CHANGE_NETWORK_STATE",
    "android.permission.CHANGE_WIFI_STATE",
    "android.permission.DISABLE_KEYGUARD",
    "android.permission.WAKE_LOCK",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    "android.permission.PACKAGE_USAGE_STATS",
    "android.permission.WRITE_SETTINGS",
    "android.permission.WRITE_SECURE_SETTINGS",
    "android.permission.INSTALL_PACKAGES",
    "android.permission.DELETE_PACKAGES",
}


def parse_manifest(manifest_path: str) -> Dict[str, Any]:
    """
    Parse AndroidManifest.xml for comprehensive security analysis.

    Args:
        manifest_path: Path to AndroidManifest.xml file.

    Returns:
        Dict with permissions, components, security flags, and misconfigurations.
    """
    result = {
        "permissions": {"all": [], "dangerous": [], "normal": [], "malware_indicators": []},
        "activities": [],
        "services": [],
        "receivers": [],
        "providers": [],
        "exported_components": [],
        "intent_filters": [],
        "security_flags": {},
        "misconfigurations": [],
        "package_name": "unknown",
        "min_sdk": None,
        "target_sdk": None,
    }

    try:
        tree = ET.parse(manifest_path)
        root = tree.getroot()
    except ET.ParseError as e:
        logger.error(f"Failed to parse manifest XML: {e}")
        return result
    except FileNotFoundError:
        logger.error(f"Manifest file not found: {manifest_path}")
        return result
    except Exception as e:
        logger.error(f"Unexpected error parsing manifest: {e}")
        return result

    # Package name
    result["package_name"] = root.get("package", "unknown")

    # SDK versions
    uses_sdk = root.find("uses-sdk")
    if uses_sdk is not None:
        result["min_sdk"] = uses_sdk.get(f"{{{ANDROID_NS}}}minSdkVersion")
        result["target_sdk"] = uses_sdk.get(f"{{{ANDROID_NS}}}targetSdkVersion")

    # Permissions
    result["permissions"] = _parse_permissions(root)

    # Application-level attributes
    app_element = root.find("application")
    if app_element is not None:
        result["security_flags"] = _parse_security_flags(app_element)
        result["activities"] = _parse_components(app_element, "activity")
        result["services"] = _parse_components(app_element, "service")
        result["receivers"] = _parse_components(app_element, "receiver")
        result["providers"] = _parse_components(app_element, "provider")

    # Collect all exported components
    for comp_type in ["activities", "services", "receivers", "providers"]:
        for comp in result[comp_type]:
            if comp.get("exported"):
                result["exported_components"].append({
                    "type": comp_type.rstrip("s"),
                    "name": comp["name"],
                    "intent_filters": comp.get("intent_filters", []),
                })

    # Collect all intent filters
    for comp_type in ["activities", "services", "receivers"]:
        for comp in result[comp_type]:
            for intent_filter in comp.get("intent_filters", []):
                result["intent_filters"].append({
                    "component": comp["name"],
                    "component_type": comp_type.rstrip("s"),
                    **intent_filter,
                })

    # Security misconfiguration detection
    result["misconfigurations"] = _detect_misconfigurations(result)

    return result


def _parse_permissions(root) -> Dict[str, Any]:
    """Extract and classify all permissions from the manifest."""
    all_perms = []
    dangerous = []
    normal = []
    malware_indicators = []

    for uses_perm in root.findall("uses-permission"):
        perm_name = uses_perm.get(f"{{{ANDROID_NS}}}name")
        if perm_name:
            all_perms.append(perm_name)
            if perm_name in DANGEROUS_PERMISSIONS:
                dangerous.append(perm_name)
            elif perm_name in MALWARE_INDICATOR_PERMISSIONS:
                malware_indicators.append(perm_name)
            else:
                normal.append(perm_name)

    return {
        "all": all_perms,
        "dangerous": dangerous,
        "normal": normal,
        "malware_indicators": malware_indicators,
        "total_count": len(all_perms),
        "dangerous_count": len(dangerous),
        "malware_indicator_count": len(malware_indicators),
    }


def _parse_security_flags(app_element) -> Dict[str, Any]:
    """Extract security-relevant flags from the <application> element."""
    def _get_bool(attr: str) -> Optional[bool]:
        val = app_element.get(f"{{{ANDROID_NS}}}{attr}")
        if val is None:
            return None
        return val.lower() == "true"

    return {
        "debuggable": _get_bool("debuggable"),
        "allow_backup": _get_bool("allowBackup"),
        "uses_cleartext_traffic": _get_bool("usesCleartextTraffic"),
        "network_security_config": app_element.get(
            f"{{{ANDROID_NS}}}networkSecurityConfig"
        ),
        "theme": app_element.get(f"{{{ANDROID_NS}}}theme"),
        "large_heap": _get_bool("largeHeap"),
        "test_only": _get_bool("testOnly"),
    }


def _parse_components(app_element, tag: str) -> List[Dict[str, Any]]:
    """Parse activity/service/receiver/provider components."""
    components = []

    for elem in app_element.findall(tag):
        name = elem.get(f"{{{ANDROID_NS}}}name", "unknown")
        exported_attr = elem.get(f"{{{ANDROID_NS}}}exported")
        permission = elem.get(f"{{{ANDROID_NS}}}permission")
        enabled = elem.get(f"{{{ANDROID_NS}}}enabled", "true")

        # Parse intent filters
        intent_filters = []
        has_intent_filter = False
        for if_elem in elem.findall("intent-filter"):
            has_intent_filter = True
            actions = []
            categories = []
            data_schemes = []

            for action in if_elem.findall("action"):
                a_name = action.get(f"{{{ANDROID_NS}}}name")
                if a_name:
                    actions.append(a_name)

            for category in if_elem.findall("category"):
                c_name = category.get(f"{{{ANDROID_NS}}}name")
                if c_name:
                    categories.append(c_name)

            for data in if_elem.findall("data"):
                scheme = data.get(f"{{{ANDROID_NS}}}scheme")
                host = data.get(f"{{{ANDROID_NS}}}host")
                if scheme:
                    data_schemes.append(f"{scheme}://{host}" if host else scheme)

            intent_filters.append({
                "actions": actions,
                "categories": categories,
                "data_schemes": data_schemes,
            })

        # Determine exported status
        if exported_attr is not None:
            exported = exported_attr.lower() == "true"
        else:
            # Pre-Android 12: components with intent-filters are implicitly exported
            exported = has_intent_filter

        components.append({
            "name": name,
            "exported": exported,
            "permission": permission,
            "enabled": enabled.lower() != "false",
            "has_intent_filter": has_intent_filter,
            "intent_filters": intent_filters,
        })

    return components


def _detect_misconfigurations(parsed: Dict[str, Any]) -> List[Dict[str, str]]:
    """Detect common security misconfigurations in the manifest."""
    issues = []
    flags = parsed.get("security_flags", {})

    if flags.get("debuggable") is True:
        issues.append({
            "severity": "critical",
            "issue": "Application is debuggable",
            "detail": "android:debuggable=true allows attacker to attach a debugger and inspect app internals.",
            "owasp": "M7 — Insufficient Binary Protections",
        })

    if flags.get("allow_backup") is True or flags.get("allow_backup") is None:
        issues.append({
            "severity": "high",
            "issue": "Application allows backup",
            "detail": "android:allowBackup=true (or default) allows data extraction via ADB backup.",
            "owasp": "M9 — Insecure Data Storage",
        })

    if flags.get("uses_cleartext_traffic") is True:
        issues.append({
            "severity": "high",
            "issue": "Cleartext traffic allowed",
            "detail": "android:usesCleartextTraffic=true allows unencrypted HTTP connections.",
            "owasp": "M5 — Insecure Communication",
        })

    # Exported components without permission protection
    for comp in parsed.get("exported_components", []):
        if not comp.get("permission"):
            # Skip the main launcher activity — that's expected to be exported
            is_launcher = False
            for ifilter in comp.get("intent_filters", []):
                actions = ifilter.get("actions", [])
                cats = ifilter.get("categories", [])
                if ("android.intent.action.MAIN" in actions and
                        "android.intent.category.LAUNCHER" in cats):
                    is_launcher = True
                    break
            if not is_launcher:
                issues.append({
                    "severity": "medium",
                    "issue": f"Exported {comp['type']} without permission",
                    "detail": f"Component '{comp['name']}' is exported without a required permission, "
                              "allowing any app to interact with it.",
                    "owasp": "M8 — Security Misconfiguration",
                })

    # Suspicious permission combinations
    perms = parsed.get("permissions", {})
    dangerous = set(perms.get("dangerous", []))
    indicators = set(perms.get("malware_indicators", []))

    if ("android.permission.RECEIVE_BOOT_COMPLETED" in indicators and
            len(dangerous) >= 3):
        issues.append({
            "severity": "high",
            "issue": "Boot persistence with dangerous permissions",
            "detail": "App starts on boot and requests multiple dangerous permissions — "
                      "common malware behavior pattern.",
            "owasp": "M8 — Security Misconfiguration",
        })

    if "android.permission.BIND_ACCESSIBILITY_SERVICE" in indicators:
        issues.append({
            "severity": "critical",
            "issue": "Accessibility service binding",
            "detail": "BIND_ACCESSIBILITY_SERVICE allows the app to monitor all screen content "
                      "and user interactions — heavily abused by banking trojans and spyware.",
            "owasp": "M1 — Improper Credential Usage",
        })

    if "android.permission.BIND_DEVICE_ADMIN" in indicators:
        issues.append({
            "severity": "critical",
            "issue": "Device admin binding",
            "detail": "BIND_DEVICE_ADMIN allows the app to lock the device, wipe data, "
                      "and resist uninstallation — common ransomware behavior.",
            "owasp": "M8 — Security Misconfiguration",
        })

    return issues

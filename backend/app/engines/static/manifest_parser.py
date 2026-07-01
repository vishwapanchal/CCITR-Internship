import xml.etree.ElementTree as ET
from typing import Dict, Any, List

DANGEROUS_PERMISSIONS = {
    "android.permission.READ_SMS",
    "android.permission.SEND_SMS",
    "android.permission.RECEIVE_SMS",
    "android.permission.READ_CONTACTS",
    "android.permission.READ_CALL_LOG",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO"
}

def parse_manifest(manifest_path: str) -> Dict[str, Any]:
    """
    Parses AndroidManifest.xml to extract permissions and classify them.
    """
    try:
        tree = ET.parse(manifest_path)
        root = tree.getroot()
    except Exception:
        return {"permissions": [], "dangerous": [], "normal": []}
    
    # Android XML namespace
    ns = {'android': 'http://schemas.android.com/apk/res/android'}
    
    permissions = []
    dangerous = []
    normal = []
    
    for uses_perm in root.findall('uses-permission'):
        perm_name = uses_perm.get(f"{{{ns['android']}}}name")
        if perm_name:
            permissions.append(perm_name)
            if perm_name in DANGEROUS_PERMISSIONS:
                dangerous.append(perm_name)
            else:
                normal.append(perm_name)
                
    return {
        "permissions": permissions,
        "dangerous": dangerous,
        "normal": normal
    }

from typing import Dict, Any

def compute_static_risk(analysis_results: Dict[str, Any]) -> int:
    """
    Computes a risk score (0-100) based on static findings.
    """
    score = 0
    
    # 1. Permission profile weighting
    permissions = analysis_results.get("permissions", {})
    dangerous_perms = permissions.get("dangerous", [])
    
    # Each dangerous permission adds to the risk (cap at 40 points)
    perm_score = min(len(dangerous_perms) * 10, 40)
    score += perm_score
    
    # 2. IOC weighting
    iocs = analysis_results.get("iocs", {})
    urls = iocs.get("urls", [])
    ips = iocs.get("ips", [])
    
    # Presence of raw IPs is usually suspicious in mobile apps
    if ips:
        score += 20
        
    # Lots of external URLs might be C2 servers
    if len(urls) > 0:
        score += min(len(urls) * 5, 20)
        
    # 3. YARA matches (Mocked for now)
    yara_hits = analysis_results.get("yara_matches", [])
    score += min(len(yara_hits) * 20, 20)
    
    return min(score, 100)

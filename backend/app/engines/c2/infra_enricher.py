"""
Infrastructure Enricher — GeoIP & WHOIS-style enrichment for C2 nodes.
Enriches IP and Domain nodes with geolocation and ownership metadata
using only local/built-in Python libraries (no external API calls).
"""

import ipaddress
import logging
import socket
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Built-in IP range to ASN/country mapping for well-known cloud providers.
# In production, you would use a local GeoLite2 database. This provides
# useful attribution without any external API calls.
KNOWN_IP_RANGES = {
    "13.": {"provider": "Amazon AWS", "country": "US"},
    "34.": {"provider": "Google Cloud", "country": "US"},
    "35.": {"provider": "Google Cloud", "country": "US"},
    "40.": {"provider": "Microsoft Azure", "country": "US"},
    "52.": {"provider": "Amazon AWS", "country": "US"},
    "54.": {"provider": "Amazon AWS", "country": "US"},
    "104.": {"provider": "Cloudflare/Google", "country": "US"},
    "142.": {"provider": "Google", "country": "US"},
    "172.217.": {"provider": "Google", "country": "US"},
    "185.": {"provider": "European Hosting", "country": "EU"},
    "192.": {"provider": "Various", "country": "US"},
    "198.": {"provider": "Various US", "country": "US"},
    "203.": {"provider": "APNIC", "country": "APAC"},
    "223.": {"provider": "APNIC", "country": "APAC"},
}

# Known suspicious TLDs used in malware infrastructure
SUSPICIOUS_TLDS = {
    ".tk", ".ml", ".ga", ".cf", ".gq",  # Free TLDs, commonly abused
    ".top", ".xyz", ".club", ".online", ".site", ".icu",
    ".pw", ".ws", ".cc", ".buzz", ".live",
}

# Known bulletproof hosting indicators
BULLETPROOF_INDICATORS = [
    "vdsina", "serverius", "king-servers", "quasi", "maxided",
    "ecatel", "hostkey", "deltahost", "selectel",
]


def enrich_ip(ip_address: str) -> Dict[str, Any]:
    """
    Enrich an IP address with local metadata.
    No external API calls — uses heuristics and built-in ranges.
    """
    result = {
        "address": ip_address,
        "is_private": False,
        "is_reserved": False,
        "provider": "Unknown",
        "country": "Unknown",
        "risk_indicators": [],
    }

    try:
        ip_obj = ipaddress.ip_address(ip_address)
        result["is_private"] = ip_obj.is_private
        result["is_reserved"] = ip_obj.is_reserved or ip_obj.is_loopback
        result["version"] = ip_obj.version

        if ip_obj.is_private:
            result["provider"] = "Private Network"
            result["country"] = "Local"
            return result

        if ip_obj.is_reserved or ip_obj.is_loopback:
            result["provider"] = "Reserved"
            return result

    except ValueError:
        result["risk_indicators"].append("Invalid IP format")
        return result

    # Match against known ranges
    for prefix, info in KNOWN_IP_RANGES.items():
        if ip_address.startswith(prefix):
            result["provider"] = info["provider"]
            result["country"] = info["country"]
            break

    # Try reverse DNS lookup (local operation, no external API)
    try:
        hostname = socket.getfqdn(ip_address)
        if hostname != ip_address:
            result["reverse_dns"] = hostname
            # Check for bulletproof indicators
            for indicator in BULLETPROOF_INDICATORS:
                if indicator in hostname.lower():
                    result["risk_indicators"].append(
                        f"Bulletproof hosting indicator: {indicator}"
                    )
    except Exception:
        pass

    return result


def enrich_domain(domain: str) -> Dict[str, Any]:
    """
    Enrich a domain with local metadata.
    Checks TLD reputation, resolves IPs, identifies suspicious patterns.
    """
    result = {
        "domain": domain,
        "tld": "",
        "suspicious_tld": False,
        "resolved_ips": [],
        "risk_indicators": [],
    }

    # Extract TLD
    parts = domain.rsplit(".", 1)
    if len(parts) == 2:
        result["tld"] = f".{parts[1]}"
        if result["tld"] in SUSPICIOUS_TLDS:
            result["suspicious_tld"] = True
            result["risk_indicators"].append(
                f"Suspicious TLD: {result['tld']} (commonly used in malware)"
            )

    # Check for DGA-like characteristics
    domain_body = parts[0] if parts else domain
    if _looks_like_dga(domain_body):
        result["risk_indicators"].append(
            "Domain resembles DGA (Domain Generation Algorithm) output"
        )

    # Resolve domain to IPs (local DNS resolution)
    try:
        addrs = socket.getaddrinfo(domain, None, socket.AF_INET)
        result["resolved_ips"] = list(set(addr[4][0] for addr in addrs))
    except socket.gaierror:
        result["risk_indicators"].append("Domain does not resolve (possible dead C2)")
    except Exception:
        pass

    # Check domain length — excessively long domains are suspicious
    if len(domain) > 40:
        result["risk_indicators"].append("Excessively long domain name")

    return result


def enrich_all(
    domains: List[str], ips: List[str]
) -> Dict[str, Any]:
    """
    Enrich all domains and IPs and return a combined enrichment report.
    """
    enriched_domains = []
    enriched_ips = []
    total_risk_indicators = 0

    for domain in domains:
        enriched = enrich_domain(domain)
        enriched_domains.append(enriched)
        total_risk_indicators += len(enriched.get("risk_indicators", []))

    for ip in ips:
        enriched = enrich_ip(ip)
        enriched_ips.append(enriched)
        total_risk_indicators += len(enriched.get("risk_indicators", []))

    return {
        "domains": enriched_domains,
        "ips": enriched_ips,
        "total_risk_indicators": total_risk_indicators,
        "suspicious_tld_count": sum(
            1 for d in enriched_domains if d.get("suspicious_tld")
        ),
    }


def _looks_like_dga(domain_body: str) -> bool:
    """
    Simple heuristic to detect DGA-generated domain names.
    DGA domains tend to have high consonant ratios and low dictionary-word overlap.
    """
    if len(domain_body) < 8:
        return False

    # Remove subdomains
    label = domain_body.split(".")[-1] if "." in domain_body else domain_body

    if len(label) < 8:
        return False

    vowels = set("aeiou")
    consonant_count = sum(1 for c in label.lower() if c.isalpha() and c not in vowels)
    alpha_count = sum(1 for c in label if c.isalpha())

    if alpha_count == 0:
        return False

    consonant_ratio = consonant_count / alpha_count

    # High consonant ratio + high digit count = likely DGA
    digit_count = sum(1 for c in label if c.isdigit())

    if consonant_ratio > 0.75 and len(label) > 12:
        return True
    if digit_count > len(label) * 0.3 and len(label) > 10:
        return True

    return False

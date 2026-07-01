import re
import os
from typing import List, Set

URL_REGEX = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
IP_REGEX = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')

def extract_iocs_from_file(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    urls = set(URL_REGEX.findall(content))
    ips = set(IP_REGEX.findall(content))
    
    return {
        "urls": list(urls),
        "ips": list(ips)
    }

def extract_iocs_from_directory(directory: str) -> dict:
    """
    Recursively scans a directory (e.g., extracted smali code) for IOCs.
    """
    all_urls: Set[str] = set()
    all_ips: Set[str] = set()
    
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            # Basic check to avoid binary files, we mostly care about smali, xml, and java
            if file.endswith((".smali", ".java", ".xml", ".txt")):
                iocs = extract_iocs_from_file(file_path)
                all_urls.update(iocs["urls"])
                all_ips.update(iocs["ips"])
                
    return {
        "urls": list(all_urls),
        "ips": list(all_ips)
    }

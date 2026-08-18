import hashlib
from typing import IO
import json
import os
from datetime import datetime

def calculate_sha256(file_obj: IO) -> str:
    """
    Calculates the SHA256 hash of a file object by reading it in chunks.
    """
    sha256_hash = hashlib.sha256()
    # Read in 4K chunks
    for byte_block in iter(lambda: file_obj.read(4096), b""):
        sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def append_to_manifest(case_dir: str, artifact_name: str, file_hash: str) -> None:
    """
    Appends an artifact and its hash to the sha256_manifest.json for the case.
    """
    manifest_path = os.path.join(case_dir, "sha256_manifest.json")
    
    manifest_data = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, "r") as f:
            try:
                manifest_data = json.load(f)
            except json.JSONDecodeError:
                manifest_data = {}
                
    manifest_data[artifact_name] = {
        "sha256": file_hash,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    with open(manifest_path, "w") as f:
        json.dump(manifest_data, f, indent=4)

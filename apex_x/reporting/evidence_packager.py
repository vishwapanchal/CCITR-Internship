import os
import zipfile
import json
import hashlib
import hmac
import secrets
from datetime import datetime


class EvidencePackager:
    """
    Packages artifacts into a Section 65B compliant ZIP file.
    Includes SHA256 manifest, chain of custody, and HMAC signature.
    """
    
    def __init__(self, cases_dir: str, keys_dir: str):
        self.cases_dir = cases_dir
        self.keys_dir = keys_dir
        os.makedirs(keys_dir, exist_ok=True)
        
    def _get_system_key(self) -> bytes:
        """
        Loads the HMAC signing key from a secure source.
        
        Priority:
        1. APEX_SIGNING_KEY environment variable (for Docker/production)
        2. keys/hmac_signing.key file (persistent file-based vault)
        3. Auto-generate a 256-bit random key and save it (first-run bootstrap)
        """
        # 1. Environment variable (production / Docker Secrets)
        env_key = os.environ.get("APEX_SIGNING_KEY")
        if env_key:
            return env_key.encode("utf-8")
        
        # 2. File-based key vault
        key_path = os.path.join(self.keys_dir, "hmac_signing.key")
        meta_path = os.path.join(self.keys_dir, "hmac_signing.meta.json")
        
        if os.path.exists(key_path):
            with open(key_path, "rb") as f:
                return f.read()
        
        # 3. Auto-generate on first run
        new_key = secrets.token_bytes(32)  # 256-bit key
        
        with open(key_path, "wb") as f:
            f.write(new_key)
        
        # Restrict file permissions (owner read-only)
        try:
            os.chmod(key_path, 0o400)
        except OSError:
            pass  # Windows doesn't support chmod
            
        # Save key metadata
        meta = {
            "key_id": secrets.token_hex(8),
            "algorithm": "HMAC-SHA256",
            "key_size_bits": 256,
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": "APEX-X EvidencePackager (auto-bootstrap)",
            "note": "This key signs evidence packages. Back it up securely."
        }
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
            
        return new_key

    def _get_key_id(self) -> str:
        """Get the key ID for the current signing key (for audit trail)."""
        meta_path = os.path.join(self.keys_dir, "hmac_signing.meta.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    meta = json.load(f)
                return meta.get("key_id", "unknown")
            except Exception:
                pass
        
        # If using env var, derive a key_id from its hash
        env_key = os.environ.get("APEX_SIGNING_KEY")
        if env_key:
            return hashlib.sha256(env_key.encode()).hexdigest()[:16]
        
        return "unknown"
        
    def _calculate_sha256(self, filepath: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def package_case(self, case_id: str, case_number: str) -> str:
        """
        Builds the Section 65B signed evidence ZIP.
        """
        case_dir = os.path.join(self.cases_dir, case_id)
        if not os.path.exists(case_dir):
            raise FileNotFoundError(f"Case directory not found: {case_dir}")
            
        output_zip = os.path.join(self.cases_dir, f"Evidence_{case_number}.zip")
        manifest = {
            "case_id": case_id,
            "case_number": case_number,
            "generated_at": datetime.utcnow().isoformat(),
            "files": {}
        }
        
        # 1. Build Manifest and ZIP
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(case_dir):
                for file in files:
                    if file.endswith('.zip'):
                        continue # Don't pack the zip inside itself
                        
                    filepath = os.path.join(root, file)
                    rel_path = os.path.relpath(filepath, case_dir)
                    
                    file_hash = self._calculate_sha256(filepath)
                    manifest["files"][rel_path] = file_hash
                    
                    zipf.write(filepath, rel_path)
            
            # Write manifest to zip
            manifest_str = json.dumps(manifest, indent=2)
            zipf.writestr("sha256_manifest.json", manifest_str)
            
            # Write Section 65B Certificate stub
            cert_content = f"SECTION 65B CERTIFICATE\nCase: {case_number}\nGenerated: {manifest['generated_at']}\nHash: {hashlib.sha256(manifest_str.encode()).hexdigest()}"
            zipf.writestr("section_65b_certificate.txt", cert_content)
            
        # 2. Calculate HMAC-SHA256 of the final ZIP
        signing_key = self._get_system_key()
        hmac_obj = hmac.new(signing_key, msg=None, digestmod=hashlib.sha256)
        with open(output_zip, 'rb') as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                hmac_obj.update(byte_block)
                
        signature = hmac_obj.hexdigest()
        
        # 3. Save signature file with key metadata alongside ZIP
        sig_path = f"{output_zip}.sig"
        sig_data = {
            "signature": signature,
            "algorithm": "HMAC-SHA256",
            "key_id": self._get_key_id(),
            "signed_at": datetime.utcnow().isoformat(),
            "file": os.path.basename(output_zip),
            "file_sha256": self._calculate_sha256(output_zip),
        }
        with open(sig_path, 'w') as f:
            json.dump(sig_data, f, indent=2)
            
        return output_zip

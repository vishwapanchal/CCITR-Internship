import os
import zipfile
import json
import hashlib
import hmac
from datetime import datetime

class EvidencePackager:
    """
    Packages artifacts into a Section 65B compliant ZIP file.
    Includes SHA256 manifest, chain of custody, and HMAC signature.
    """
    
    def __init__(self, cases_dir: str, keys_dir: str):
        self.cases_dir = cases_dir
        self.keys_dir = keys_dir
        
    def _get_system_key(self) -> bytes:
        """Loads the system HMAC key for signing evidence."""
        # Stub: In production, load from secure vault/HSM
        return b"apex_x_forensic_signing_key_v1"
        
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
        hmac_obj = hmac.new(self._get_system_key(), msg=None, digestmod=hashlib.sha256)
        with open(output_zip, 'rb') as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                hmac_obj.update(byte_block)
                
        signature = hmac_obj.hexdigest()
        
        # 3. Save signature file alongside ZIP
        sig_path = f"{output_zip}.sig"
        with open(sig_path, 'w') as f:
            f.write(signature)
            
        return output_zip

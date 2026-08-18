import os
import zipfile
import shutil
from fastapi import UploadFile

def is_valid_apk(file_path: str) -> bool:
    """
    Validates if the file is a proper ZIP archive and contains essential APK files.
    """
    if not zipfile.is_zipfile(file_path):
        return False
        
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            file_names = z.namelist()
            # An APK must contain an AndroidManifest.xml and usually classes.dex
            if "AndroidManifest.xml" not in file_names:
                return False
            # While some modern apps use split APKs, a base APK usually has classes.dex
            # We'll just check for manifest to be safe, but ideally check for classes.dex too
            return True
    except zipfile.BadZipFile:
        return False

def save_upload_file(upload_file: UploadFile, destination_path: str) -> bool:
    """
    Saves an uploaded file to the local disk safely in chunks.
    """
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        
        # Reset file pointer for any further reading (like hashing)
        upload_file.file.seek(0)
        return True
    except Exception:
        return False

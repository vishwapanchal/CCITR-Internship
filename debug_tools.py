import os
import sys
import shutil
import subprocess

def check_cmd(cmd):
    path = shutil.which(cmd)
    if not path:
        # Check common paths
        for p in [f"/usr/local/bin/{cmd}", f"/usr/bin/{cmd}", f"/opt/{cmd}/bin/{cmd}"]:
            if os.path.isfile(p) and os.access(p, os.X_OK):
                return p
        return None
    return path

print("========================================")
print("       APEX-X DIAGNOSTIC TOOL")
print("========================================")

# 1. Check Python Version
print(f"Python Version: {sys.version.split()[0]}")

# 2. Check Java
java_path = check_cmd("java")
if java_path:
    print(f"[OK] Java found at {java_path}")
    try:
        ver = subprocess.check_output([java_path, "-version"], stderr=subprocess.STDOUT, text=True)
        print(f"     Version info: {ver.split(chr(10))[0]}")
    except Exception as e:
        print(f"[ERROR] Failed to run Java: {e}")
else:
    print("[FAIL] Java NOT FOUND. Please run: sudo apt-get install default-jre")

# 3. Check Apktool
apktool = check_cmd("apktool")
if apktool:
    print(f"[OK] Apktool found at {apktool}")
    try:
        ver = subprocess.check_output([apktool, "--version"], stderr=subprocess.STDOUT, text=True).strip()
        print(f"     Version: {ver}")
    except Exception as e:
        print(f"[ERROR] Failed to run Apktool: {e}")
else:
    print("[FAIL] Apktool NOT FOUND.")

# 4. Check Jadx
jadx = check_cmd("jadx")
if jadx:
    print(f"[OK] Jadx found at {jadx}")
    try:
        ver = subprocess.check_output([jadx, "--version"], stderr=subprocess.STDOUT, text=True).strip()
        print(f"     Version: {ver}")
    except Exception as e:
        print(f"[ERROR] Failed to run Jadx: {e}")
else:
    print("[FAIL] Jadx NOT FOUND.")

# 5. Check Androguard
try:
    import androguard
    print(f"[OK] Androguard imported successfully. Version: {getattr(androguard, '__version__', 'unknown')}")
except ImportError as e:
    print(f"[FAIL] Androguard NOT FOUND in this Python environment: {e}")

# 6. Check Yara
try:
    import yara
    print(f"[OK] yara-python imported successfully.")
except ImportError as e:
    print(f"[FAIL] yara-python NOT FOUND in this Python environment: {e}")

print("========================================")

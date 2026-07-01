import os
import shutil

APP_DIR = "c:\\Users\\Prafull\\Desktop\\Apex-X\\backend\\app"

# Directories to create
DIRS = [
    "api/routes",
    "api/middleware",
    "models",
    "services",
    "utils"
]

for d in DIRS:
    os.makedirs(os.path.join(APP_DIR, d), exist_ok=True)

# 1. Move config.py
if os.path.exists(os.path.join(APP_DIR, "core", "config.py")):
    shutil.move(os.path.join(APP_DIR, "core", "config.py"), os.path.join(APP_DIR, "config.py"))
    
# 2. Move upload.py
if os.path.exists(os.path.join(APP_DIR, "api", "endpoints", "upload.py")):
    shutil.move(os.path.join(APP_DIR, "api", "endpoints", "upload.py"), os.path.join(APP_DIR, "api", "routes", "upload.py"))

# 3. Create other route files
for route in ["cases.py", "analysis.py", "results.py", "reports.py", "auth.py"]:
    open(os.path.join(APP_DIR, "api", "routes", route), "a").close()
    
# 4. Create middleware
for mw in ["rbac.py", "audit.py"]:
    open(os.path.join(APP_DIR, "api", "middleware", mw), "a").close()

# 5. Move database models and schemas
if os.path.exists(os.path.join(APP_DIR, "db", "models.py")):
    shutil.move(os.path.join(APP_DIR, "db", "models.py"), os.path.join(APP_DIR, "models", "database.py"))

if os.path.exists(os.path.join(APP_DIR, "db", "session.py")):
    # we'll manually merge session into models/database.py later or move it
    shutil.move(os.path.join(APP_DIR, "db", "session.py"), os.path.join(APP_DIR, "models", "session.py"))

if os.path.exists(os.path.join(APP_DIR, "schemas", "case.py")):
    shutil.move(os.path.join(APP_DIR, "schemas", "case.py"), os.path.join(APP_DIR, "models", "schemas.py"))

# Create enums
open(os.path.join(APP_DIR, "models", "enums.py"), "a").close()

# 6. Move/Create services
if os.path.exists(os.path.join(APP_DIR, "utils", "hash.py")):
    shutil.move(os.path.join(APP_DIR, "utils", "hash.py"), os.path.join(APP_DIR, "services", "hash_service.py"))

for srv in ["case_service.py", "task_service.py"]:
    open(os.path.join(APP_DIR, "services", srv), "a").close()

# 7. Create utils
for u in ["security.py", "file_utils.py"]:
    open(os.path.join(APP_DIR, "utils", u), "a").close()

# Clean up old empty dirs if they exist
for d in ["core", "db", "schemas", "api/endpoints"]:
    path = os.path.join(APP_DIR, d)
    if os.path.exists(path) and not os.listdir(path):
        os.rmdir(path)
        
print("Refactoring complete.")

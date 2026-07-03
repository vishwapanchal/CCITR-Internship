import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.engines.static import run_full_static_analysis
from app.models.database import Case
from sqlalchemy.orm import Session
from app.models.session import SessionLocal

# Just test if it imports correctly and doesn't crash on mocked paths
try:
    print("Integration test passed imports")
except Exception as e:
    print("Integration test failed imports:", e)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

from app.models.session import engine
from app.models.database import Base

# Create database tables
# In a real production app, this would be handled by Alembic migrations
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="APEX-X Platform API",
    description="Agentic APK Profiling, Exploitation Intelligence & Threat Attribution",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes import upload, auth, ws, cases, results, reports

app.include_router(cases.router, prefix=settings.API_V1_STR + "/cases", tags=["cases"])
app.include_router(upload.router, prefix=settings.API_V1_STR + "/cases", tags=["cases"])
app.include_router(results.router, prefix=settings.API_V1_STR + "/cases", tags=["results"])
app.include_router(reports.router, prefix=settings.API_V1_STR + "/reports", tags=["reports"])
app.include_router(auth.router, prefix=settings.API_V1_STR + "/auth", tags=["auth"])
app.include_router(ws.router, prefix=settings.API_V1_STR + "/copilot", tags=["websocket"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "APEX-X backend is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)

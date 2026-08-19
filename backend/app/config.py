from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "APEX-X Backend API"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "apex")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "apexpassword")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "apex_db")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "temporary_dev_secret_key_change_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", "sqlite:///./apex_x.db")
    
    # Redis & Celery
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: str = os.getenv("REDIS_PORT", "6379")

    # Ollama (Local LLM)
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL_CODER: str = os.getenv("OLLAMA_MODEL_CODER", "qwen3:8b")
    OLLAMA_MODEL_SECURITY: str = os.getenv("OLLAMA_MODEL_SECURITY", "qwen3:8b")
    OLLAMA_TIMEOUT: int = 300  # 5 min for slow machines

    # Neo4j
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "apexpassword")

    # ChromaDB
    CHROMADB_HOST: str = os.getenv("CHROMADB_HOST", "localhost")
    CHROMADB_PORT: int = int(os.getenv("CHROMADB_PORT", "8000"))
    
    # Feature Toggles
    ALLOW_BAAS_NETWORK_ENRICHMENT: bool = os.getenv("ALLOW_BAAS_NETWORK_ENRICHMENT", "False").lower() in ("true", "1", "t")

    # Threat Intelligence
    VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")
    
    # Validation
    ALLOWED_EMAIL_DOMAIN: str = os.getenv("ALLOWED_EMAIL_DOMAIN", "@cyber.gov")
    
    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        
    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    class Config:
        case_sensitive = True

settings = Settings()

from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "APEX-X Backend API"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = "apex"
    POSTGRES_PASSWORD: str = "apexpassword"
    POSTGRES_DB: str = "apex_db"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"

    SECRET_KEY: str = os.getenv("SECRET_KEY", "temporary_dev_secret_key_change_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", "sqlite:///./apex_x.db")
    
    # Redis & Celery
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: str = os.getenv("REDIS_PORT", "6379")
    
    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        
    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    class Config:
        case_sensitive = True

settings = Settings()

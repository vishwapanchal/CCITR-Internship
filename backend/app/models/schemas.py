from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

# Shared properties
class CaseBase(BaseModel):
    case_number: str
    apk_hash: str
    apk_name: Optional[str] = None
    status: Optional[str] = "pending"

# Properties to receive on case creation
class CaseCreate(CaseBase):
    pass

# Properties to receive on case update
class CaseUpdate(BaseModel):
    status: Optional[str] = None
    apk_name: Optional[str] = None

# Properties shared by models stored in DB
class CaseInDBBase(CaseBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Properties to return to client
class Case(CaseInDBBase):
    pass

# --- User Schemas ---
from app.models.enums import Role

class UserBase(BaseModel):
    username: str
    role: Role = Role.INVESTIGATOR

class UserCreate(UserBase):
    password: str

from pydantic import validator

class UserSignup(UserCreate):
    @validator("username")
    def validate_username(cls, v):
        from app.config import settings
        if not v.endswith(settings.ALLOWED_EMAIL_DOMAIN):
            raise ValueError(f"Email must end with {settings.ALLOWED_EMAIL_DOMAIN}")
        return v

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None


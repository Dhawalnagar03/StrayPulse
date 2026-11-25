from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


# ── Register / Login ──────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    role: UserRole = UserRole.CITIZEN
    profile_type: Optional[str] = Field(default=None, description="Participant category: individual, ngo, rescuer, volunteer, feeder")
    organization_name: Optional[str] = None
    organization_details: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str
    profile_type: Optional[str] = None
    organization_name: Optional[str] = None


class UserPublicResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    profile_type: Optional[str] = None
    organization_name: Optional[str] = None
    is_active: bool
    total_sightings: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None

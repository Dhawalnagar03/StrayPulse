from datetime import datetime
from typing import Optional
from pydantic import Field, EmailStr
from app.models.base import MongoBaseModel
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    CITIZEN = "citizen"
    INDIVIDUAL = "individual"
    NGO = "ngo"
    RESCUER = "rescuer"
    VOLUNTEER = "volunteer"
    FEEDER = "feeder"


class UserModel(MongoBaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    hashed_password: str
    role: UserRole = UserRole.CITIZEN
    profile_type: Optional[str] = None
    organization_name: Optional[str] = None
    organization_details: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    profile_photo: Optional[str] = None
    total_sightings: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config(MongoBaseModel.Config):
        collection = "users"

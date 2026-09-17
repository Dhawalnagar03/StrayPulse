from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.animal import AnimalType, AnimalSex, AnimalStatus


class AnimalCreateRequest(BaseModel):
    animal_type: AnimalType
    name_label: Optional[str] = None
    sex: AnimalSex = AnimalSex.UNKNOWN
    approximate_age: Optional[str] = None
    color: Optional[str] = None
    breed: Optional[str] = None
    distinctive_features: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: Optional[float] = None
    notes: Optional[str] = None
    primary_photo: Optional[str] = None


class AnimalUpdateRequest(BaseModel):
    name_label: Optional[str] = None
    sex: Optional[AnimalSex] = None
    approximate_age: Optional[str] = None
    color: Optional[str] = None
    breed: Optional[str] = None
    distinctive_features: Optional[str] = None
    status: Optional[AnimalStatus] = None
    notes: Optional[str] = None


class AnimalResponse(BaseModel):
    animal_id: str
    animal_type: AnimalType
    name_label: Optional[str] = None
    sex: AnimalSex
    approximate_age: Optional[str] = None
    color: Optional[str] = None
    breed: Optional[str] = None
    distinctive_features: Optional[str] = None
    primary_photo: Optional[str] = None
    status: AnimalStatus
    total_sightings: int
    last_seen_at: Optional[datetime] = None
    last_seen_lat: Optional[float] = None
    last_seen_lng: Optional[float] = None
    initial_lat: Optional[float] = None
    initial_lng: Optional[float] = None
    location_accuracy: Optional[float] = None
    notes: Optional[str] = None
    most_common_area: Optional[str] = None
    is_demo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AnimalMatchResult(BaseModel):
    animal_id: str
    similarity_score: float
    animal_type: str
    primary_photo: Optional[str] = None
    last_seen_at: Optional[datetime] = None

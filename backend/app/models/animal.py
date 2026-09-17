from datetime import datetime
from typing import Optional, List
from pydantic import Field
from app.models.base import MongoBaseModel
from enum import Enum


class AnimalType(str, Enum):
    DOG = "Dog"
    CAT = "Cat"
    OTHER = "Other"
    UNKNOWN = "Unknown"


class AnimalSex(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    UNKNOWN = "Unknown"


class AnimalStatus(str, Enum):
    ACTIVE = "Active"
    MISSING = "Missing from recent sightings"
    ADOPTED = "Adopted"
    RELOCATED = "Relocated"
    DECEASED = "Deceased"
    UNKNOWN = "Unknown"


class AnimalModel(MongoBaseModel):
    animal_id: str                        # e.g. DOG-00027
    animal_type: AnimalType
    name_label: Optional[str] = None      # Informal name/label by feeders
    sex: AnimalSex = AnimalSex.UNKNOWN
    approximate_age: Optional[str] = None  # "Puppy", "1-2 years", "Adult"
    color: Optional[str] = None
    breed: Optional[str] = None
    distinctive_features: Optional[str] = None
    primary_photo: Optional[str] = None   # URL / file path
    additional_photos: List[str] = Field(default_factory=list)
    status: AnimalStatus = AnimalStatus.ACTIVE
    total_sightings: int = 0
    last_seen_at: Optional[datetime] = None
    last_seen_lat: Optional[float] = None
    last_seen_lng: Optional[float] = None
    initial_lat: Optional[float] = None
    initial_lng: Optional[float] = None
    location_accuracy: Optional[float] = None
    notes: Optional[str] = None
    most_common_area: Optional[str] = None
    is_demo: bool = False                  # Flag for synthetic/demo data
    created_by: Optional[str] = None       # user_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config(MongoBaseModel.Config):
        collection = "animals"

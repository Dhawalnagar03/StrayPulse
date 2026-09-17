from datetime import datetime
from typing import Optional, List
from pydantic import Field
from app.models.base import MongoBaseModel, GeoJSONPoint


class FeedingLocationModel(MongoBaseModel):
    name: str
    location: GeoJSONPoint
    latitude: float
    longitude: float
    feeding_time: Optional[str] = None      # "07:30 AM"
    feeding_frequency: Optional[str] = None  # "Daily", "Weekdays"
    animal_ids: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    is_active: bool = True
    created_by: str
    is_demo: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config(MongoBaseModel.Config):
        collection = "feeding_locations"


class EnvironmentalType(str):
    ROAD = "road"
    MARKET = "market"
    GARBAGE_POINT = "garbage_point"
    PARK = "park"
    TEMPLE = "temple"
    WATER_SOURCE = "water_source"
    FEEDING_POINT = "feeding_point"


class EnvironmentalLocationModel(MongoBaseModel):
    name: str
    env_type: str  # EnvironmentalType
    location: GeoJSONPoint
    latitude: float
    longitude: float
    description: Optional[str] = None
    is_active: bool = True
    is_demo: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config(MongoBaseModel.Config):
        collection = "environmental_locations"

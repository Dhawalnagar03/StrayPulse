from datetime import datetime
from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, GeoJSONPoint
from enum import Enum


class VerificationStatus(str, Enum):
    PENDING = "Pending"
    VERIFIED = "Verified"
    REJECTED = "Rejected"


class TimeOfDay(str, Enum):
    MORNING = "Morning"      # 5–11
    AFTERNOON = "Afternoon"  # 11–17
    EVENING = "Evening"      # 17–21
    NIGHT = "Night"          # 21–5


class SightingModel(MongoBaseModel):
    animal_id: str
    user_id: str
    photo_url: Optional[str] = None

    # Location stored as GeoJSON for geospatial queries
    location: GeoJSONPoint
    latitude: float
    longitude: float
    gps_accuracy_meters: Optional[float] = None

    # Temporal
    timestamp: datetime
    day_of_week: int          # 0=Monday … 6=Sunday
    time_of_day: TimeOfDay
    hour: int                  # 0–23

    # Weather at time of sighting
    weather_condition: Optional[str] = None
    temperature_celsius: Optional[float] = None
    humidity_percent: Optional[float] = None
    rain_probability: Optional[float] = None
    wind_speed_kmh: Optional[float] = None

    # Environmental distances (meters)
    feeding_point_distance: Optional[float] = None
    road_distance: Optional[float] = None
    market_distance: Optional[float] = None
    garbage_point_distance: Optional[float] = None
    park_distance: Optional[float] = None
    water_source_distance: Optional[float] = None

    # Zone
    zone_id: Optional[str] = None         # Grid zone identifier
    zone_name: Optional[str] = None

    # Notes
    notes: Optional[str] = None
    is_feeding_point: bool = False

    # Verification
    verification_status: VerificationStatus = VerificationStatus.PENDING
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    is_suspicious: bool = False
    suspicious_reason: Optional[str] = None

    # Demo flag
    is_demo: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config(MongoBaseModel.Config):
        collection = "sightings"

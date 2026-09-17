from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.sighting import VerificationStatus, TimeOfDay


class SightingCreateRequest(BaseModel):
    animal_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timestamp: Optional[datetime] = None     # defaults to now
    notes: Optional[str] = None
    is_feeding_point: bool = False
    gps_accuracy_meters: Optional[float] = None


class SightingVerifyRequest(BaseModel):
    status: VerificationStatus
    reason: Optional[str] = None


class SightingResponse(BaseModel):
    id: str
    animal_id: str
    user_id: str
    photo_url: Optional[str] = None
    latitude: float
    longitude: float
    gps_accuracy_meters: Optional[float] = None
    timestamp: datetime
    day_of_week: int
    time_of_day: TimeOfDay
    hour: int
    weather_condition: Optional[str] = None
    temperature_celsius: Optional[float] = None
    humidity_percent: Optional[float] = None
    rain_probability: Optional[float] = None
    feeding_point_distance: Optional[float] = None
    road_distance: Optional[float] = None
    market_distance: Optional[float] = None
    garbage_point_distance: Optional[float] = None
    park_distance: Optional[float] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    notes: Optional[str] = None
    is_feeding_point: bool
    verification_status: VerificationStatus
    is_suspicious: bool
    is_demo: bool
    created_at: datetime

    class Config:
        from_attributes = True

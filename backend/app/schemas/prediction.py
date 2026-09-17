from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class PredictionResponse(BaseModel):
    animal_id: str
    prediction_date: str
    model_name: str
    model_version: str
    predicted_zone: str
    predicted_zone_id: str
    latitude: float
    longitude: float
    prediction_radius_meters: float
    time_start: str
    time_end: str
    confidence: float
    confidence_label: str
    confidence_percent: int
    factors: List[str]
    top_features: Dict[str, float]
    training_sightings_used: int
    is_demo: bool
    generated_at: str

    class Config:
        from_attributes = True


class PredictionInsufficientData(BaseModel):
    animal_id: str
    message: str
    sightings_count: int
    minimum_required: int
    suggestion: str


class FeedingLocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    feeding_time: Optional[str] = None
    feeding_frequency: Optional[str] = None
    animal_ids: List[str] = []
    notes: Optional[str] = None


class FeedingLocationResponse(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    feeding_time: Optional[str] = None
    feeding_frequency: Optional[str] = None
    animal_ids: List[str]
    notes: Optional[str] = None
    is_active: bool
    is_demo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class EnvironmentalLocationCreate(BaseModel):
    name: str
    env_type: str
    latitude: float
    longitude: float
    description: Optional[str] = None


class AnalyticsResponse(BaseModel):
    total_animals: int
    total_sightings: int
    active_animals: int
    todays_sightings: int
    predictions_generated: int
    high_confidence_predictions: int
    sightings_by_day: Dict[str, int]
    sightings_by_hour: Dict[str, int]
    animal_distribution: Dict[str, int]
    top_locations: List[Dict[str, Any]]

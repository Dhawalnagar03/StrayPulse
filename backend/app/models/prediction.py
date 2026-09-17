from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import Field
from app.models.base import MongoBaseModel


class PredictionModel(MongoBaseModel):
    animal_id: str
    prediction_date: date
    model_name: str              # "xgboost", "random_forest", "baseline"
    model_version: str

    # Predicted zone
    predicted_zone_id: str
    predicted_zone_name: Optional[str] = None
    predicted_latitude: float
    predicted_longitude: float
    prediction_radius_meters: float = 500.0

    # Time window
    time_start: str              # "07:00"
    time_end: str                # "09:00"

    # Confidence
    confidence: float            # 0.0–1.0
    confidence_label: str        # "High", "Medium", "Low"

    # Explainability
    factors: List[str] = Field(default_factory=list)
    top_features: Dict[str, float] = Field(default_factory=dict)

    # Metadata
    training_sightings_used: int = 0
    is_demo: bool = False
    is_valid: bool = True
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config(MongoBaseModel.Config):
        collection = "predictions"


class ModelVersionModel(MongoBaseModel):
    model_name: str
    version: str
    training_date: datetime
    training_samples: int
    features: List[str]
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    mean_distance_error_km: Optional[float] = None
    median_distance_error_km: Optional[float] = None
    is_active: bool = False
    model_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config(MongoBaseModel.Config):
        collection = "model_versions"

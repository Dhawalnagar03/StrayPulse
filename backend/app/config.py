from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "StrayPulse API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "straypulse"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""

    # OpenWeather
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # ML
    ML_MODEL_DIR: str = "../ml/models"
    ML_PREDICTION_THRESHOLD_CONFIDENCE: float = 0.50
    ML_MIN_SIGHTINGS_FOR_PREDICTION: int = 5

    # Geospatial defaults (Bangalore)
    DEFAULT_CITY_LAT: float = 12.9716
    DEFAULT_CITY_LNG: float = 77.5946
    DEFAULT_CITY_NAME: str = "Bangalore"
    GRID_CELL_SIZE_METERS: float = 500.0

    # Notifications
    NOTIFICATION_CONFIDENCE_THRESHOLD: float = 0.70

    # Demo seed
    ADMIN_EMAIL: str = "admin@straypulse.org"
    ADMIN_PASSWORD: str = "Admin@StrayPulse2026!"
    CITIZEN_DEMO_EMAIL: str = "citizen@demo.com"
    CITIZEN_DEMO_PASSWORD: str = "Demo@1234!"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

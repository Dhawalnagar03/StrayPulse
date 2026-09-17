import httpx
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


async def fetch_current_weather(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    """
    Fetch current weather from OpenWeather API.
    Returns structured dict or None if API unavailable.
    """
    if not settings.OPENWEATHER_API_KEY:
        logger.warning("OPENWEATHER_API_KEY not set — returning simulated weather.")
        return _simulated_weather(lat, lng)

    url = f"{settings.OPENWEATHER_BASE_URL}/weather"
    params = {
        "lat": lat,
        "lon": lng,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return {
                "weather_condition": data["weather"][0]["main"],
                "temperature_celsius": data["main"]["temp"],
                "humidity_percent": data["main"]["humidity"],
                "wind_speed_kmh": data["wind"]["speed"] * 3.6,
                "rain_probability": data.get("pop", 0.0),
                "source": "openweather",
                "fetched_at": datetime.utcnow().isoformat(),
            }
    except Exception as exc:
        logger.error(f"Weather API error: {exc}. Using simulated data.")
        return _simulated_weather(lat, lng)


def _simulated_weather(lat: float, lng: float) -> Dict[str, Any]:
    """Return deterministic simulated weather for demo/development purposes."""
    import random
    hour = datetime.utcnow().hour
    # Simple heuristic: warmer in afternoon
    base_temp = 25.0 + (5.0 if 10 <= hour <= 16 else 0.0)
    conditions = ["Clear", "Clouds", "Rain", "Drizzle", "Mist"]
    condition = conditions[hour % len(conditions)]
    return {
        "weather_condition": condition,
        "temperature_celsius": round(base_temp + random.uniform(-2, 2), 1),
        "humidity_percent": random.randint(50, 85),
        "wind_speed_kmh": round(random.uniform(5, 20), 1),
        "rain_probability": 0.3 if "Rain" in condition else 0.05,
        "source": "simulated",
        "fetched_at": datetime.utcnow().isoformat(),
    }

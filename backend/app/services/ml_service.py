"""
ML Prediction Service — wraps the trained XGBoost/RF model for the prediction API.
Falls back to frequency-based baseline if no model is saved yet.
"""

import os
import pickle
import logging
import json
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path

from app.config import settings
from app.services.geo import lat_lng_to_zone_id, zone_id_to_center, haversine_distance

logger = logging.getLogger(__name__)

_model = None
_model_meta: Dict[str, Any] = {}
_FEATURES = [
    "hour", "day_of_week", "month", "is_weekend",
    "prev_lat", "prev_lng",
    "avg_movement_distance",
    "feeding_distance", "road_distance", "market_distance",
    "garbage_distance", "park_distance",
    "temperature", "rain_probability", "humidity",
    "recent_zone_freq",
]


def _load_model():
    global _model, _model_meta
    if _model is not None:
        return _model

    model_dir = Path(settings.ML_MODEL_DIR)
    model_path = model_dir / "best_model.pkl"
    meta_path = model_dir / "best_model_meta.json"

    if model_path.exists():
        try:
            with open(model_path, "rb") as f:
                _model = pickle.load(f)
            if meta_path.exists():
                with open(meta_path, "r") as f:
                    _model_meta = json.load(f)
            logger.info(f"ML model loaded: {_model_meta.get('model_name', 'unknown')}")
            return _model
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")

    logger.warning("No trained model found — using frequency baseline.")
    return None


async def get_prediction(
    animal_id: str,
    sightings: List[Dict],
    env_data: Dict,
    weather: Dict,
    target_hour: int = 8,
    target_day: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generate a location prediction for an animal.
    
    sightings: list of sighting dicts sorted by timestamp desc
    env_data: {'feeding': [...], 'roads': [...], 'markets': [...], ...}
    weather: weather dict
    """
    if len(sightings) < settings.ML_MIN_SIGHTINGS_FOR_PREDICTION:
        return {
            "sufficient_data": False,
            "sightings_count": len(sightings),
            "minimum_required": settings.ML_MIN_SIGHTINGS_FOR_PREDICTION,
        }

    model = _load_model()
    prediction_date = (datetime.utcnow() + timedelta(days=1)).date()
    target_dow = target_day if target_day is not None else prediction_date.weekday()

    if model is not None:
        return await _predict_with_model(
            model, animal_id, sightings, env_data, weather,
            target_hour, target_dow, prediction_date
        )
    else:
        return await _frequency_baseline(
            animal_id, sightings, env_data, weather,
            target_hour, target_dow, prediction_date
        )


async def _predict_with_model(
    model, animal_id, sightings, env_data, weather,
    target_hour, target_dow, prediction_date
) -> Dict[str, Any]:
    """Use trained sklearn/XGBoost model for prediction."""
    import numpy as np

    features = _build_features(sightings, env_data, weather, target_hour, target_dow)
    X = np.array([list(features.values())])

    try:
        proba = model.predict_proba(X)[0]
        zone_idx = int(proba.argmax())
        confidence = float(proba.max())
        classes = model.classes_ if hasattr(model, "classes_") else []
        zone_id = classes[zone_idx] if len(classes) > zone_idx else "Z_unknown"
    except Exception as e:
        logger.error(f"Model prediction failed: {e}. Falling back to baseline.")
        return await _frequency_baseline(
            animal_id, sightings, env_data, weather,
            target_hour, target_dow, prediction_date
        )

    lat, lng = zone_id_to_center(zone_id) if zone_id.startswith("Z_") else (
        sightings[0]["latitude"], sightings[0]["longitude"]
    )

    factors = _explain_factors(sightings, env_data, zone_id, target_hour)

    return {
        "sufficient_data": True,
        "animal_id": animal_id,
        "prediction_date": str(prediction_date),
        "model_name": _model_meta.get("model_name", "xgboost"),
        "model_version": _model_meta.get("version", "1.0"),
        "predicted_zone_id": zone_id,
        "predicted_zone_name": _zone_label(zone_id, sightings),
        "latitude": lat,
        "longitude": lng,
        "prediction_radius_meters": 500.0,
        "time_start": f"{target_hour:02d}:00",
        "time_end": f"{min(target_hour + 2, 23):02d}:00",
        "confidence": confidence,
        "confidence_label": _confidence_label(confidence),
        "factors": factors,
        "top_features": {k: round(v, 3) for k, v in features.items()},
        "training_sightings_used": len(sightings),
    }


async def _frequency_baseline(
    animal_id, sightings, env_data, weather,
    target_hour, target_dow, prediction_date
) -> Dict[str, Any]:
    """Historical frequency baseline: most common zone at this hour/weekday."""
    from collections import Counter

    # Find sightings at similar hour (±2) and day of week
    similar = [
        s for s in sightings
        if abs(s.get("hour", 12) - target_hour) <= 2
        and s.get("day_of_week", -1) == target_dow
    ]
    if not similar:
        similar = [s for s in sightings if abs(s.get("hour", 12) - target_hour) <= 2]
    if not similar:
        similar = sightings[:10]

    # Most common zone
    zones = [lat_lng_to_zone_id(s["latitude"], s["longitude"]) for s in similar]
    zone_counts = Counter(zones)
    top_zone = zone_counts.most_common(1)[0][0] if zone_counts else "Z_unknown"
    confidence = min(zone_counts.most_common(1)[0][1] / max(len(similar), 1), 1.0) if zone_counts else 0.3

    lat, lng = zone_id_to_center(top_zone) if top_zone.startswith("Z_") else (
        similar[0]["latitude"], similar[0]["longitude"]
    )

    factors = _explain_factors(sightings, env_data, top_zone, target_hour)

    return {
        "sufficient_data": True,
        "animal_id": animal_id,
        "prediction_date": str(prediction_date),
        "model_name": "frequency_baseline",
        "model_version": "1.0",
        "predicted_zone_id": top_zone,
        "predicted_zone_name": _zone_label(top_zone, sightings),
        "latitude": lat,
        "longitude": lng,
        "prediction_radius_meters": 750.0,
        "time_start": f"{target_hour:02d}:00",
        "time_end": f"{min(target_hour + 2, 23):02d}:00",
        "confidence": round(confidence * 0.8, 2),  # Baseline is less confident
        "confidence_label": _confidence_label(confidence * 0.8),
        "factors": factors,
        "top_features": {},
        "training_sightings_used": len(sightings),
    }


def _build_features(sightings, env_data, weather, target_hour, target_dow) -> Dict:
    """Build feature dict for ML model."""
    from statistics import mean
    recent = sightings[:5]
    prev = sightings[0] if sightings else {}

    distances = []
    for i in range(1, min(len(sightings), 10)):
        d = haversine_distance(
            sightings[i - 1]["latitude"], sightings[i - 1]["longitude"],
            sightings[i]["latitude"], sightings[i]["longitude"]
        )
        distances.append(d)

    avg_dist = mean(distances) if distances else 200.0

    # Recent zone frequency
    from collections import Counter
    zones = [lat_lng_to_zone_id(s["latitude"], s["longitude"]) for s in sightings[:20]]
    zc = Counter(zones)
    most_common_count = zc.most_common(1)[0][1] if zc else 1
    recent_zone_freq = most_common_count / max(len(sightings[:20]), 1)

    return {
        "hour": target_hour,
        "day_of_week": target_dow,
        "month": datetime.utcnow().month,
        "is_weekend": int(target_dow >= 5),
        "prev_lat": prev.get("latitude", settings.DEFAULT_CITY_LAT),
        "prev_lng": prev.get("longitude", settings.DEFAULT_CITY_LNG),
        "avg_movement_distance": avg_dist,
        "feeding_distance": prev.get("feeding_point_distance") or 500.0,
        "road_distance": prev.get("road_distance") or 100.0,
        "market_distance": prev.get("market_distance") or 400.0,
        "garbage_distance": prev.get("garbage_point_distance") or 300.0,
        "park_distance": prev.get("park_distance") or 600.0,
        "temperature": weather.get("temperature_celsius", 25.0),
        "rain_probability": weather.get("rain_probability", 0.1),
        "humidity": weather.get("humidity_percent", 65.0),
        "recent_zone_freq": recent_zone_freq,
    }


def _explain_factors(sightings, env_data, zone_id, target_hour) -> List[str]:
    """Generate human-readable explanation factors."""
    from collections import Counter
    factors = []

    # Zone frequency
    zones = [lat_lng_to_zone_id(s["latitude"], s["longitude"]) for s in sightings]
    zc = Counter(zones)
    if zone_id in zc:
        count = zc[zone_id]
        factors.append(f"Seen in this area {count} time{'s' if count != 1 else ''} previously")

    # Time pattern
    similar_hour = [s for s in sightings if abs(s.get("hour", -1) - target_hour) <= 1]
    if similar_hour:
        factors.append(f"Most sightings between {target_hour}–{target_hour + 2} AM/PM")

    # Feeding point
    feeding_dists = [s.get("feeding_point_distance") for s in sightings[:5] if s.get("feeding_point_distance")]
    if feeding_dists and min(feeding_dists) < 300:
        factors.append(f"Feeding point approx {int(min(feeding_dists))} m away")

    # Historical movement direction
    if len(sightings) >= 3:
        factors.append("Recent movement direction consistent with this zone")

    # Day-of-week pattern
    from collections import Counter as C
    days = C([s.get("day_of_week", -1) for s in sightings])
    if days:
        factors.append(f"Frequently active on similar days of the week")

    return factors[:5]


def _zone_label(zone_id: str, sightings: List[Dict]) -> str:
    """Create a human-friendly name for a zone based on nearby sightings."""
    if not sightings:
        return zone_id
    # Use the most recent sighting's zone_name if available
    for s in sightings:
        if s.get("zone_name"):
            return s["zone_name"]
    return f"Area {zone_id}"


def _confidence_label(confidence: float) -> str:
    if confidence >= 0.75:
        return "High"
    elif confidence >= 0.50:
        return "Medium"
    else:
        return "Low"

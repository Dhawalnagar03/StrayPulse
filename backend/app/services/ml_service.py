"""
ML Prediction Service — wraps the trained model for the prediction API.
Falls back to a historical-frequency baseline only when the model artifact is missing or incompatible.
"""

import importlib.util
import json
import logging
import os
import pickle
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.geo import haversine_distance, lat_lng_to_zone_id, zone_id_to_center

logger = logging.getLogger(__name__)

_model = None
_model_meta: Dict[str, Any] = {}


def _resolve_feature_columns() -> List[str]:
    """Return the canonical feature list defined by the training pipeline."""
    try:
        from ml.features.engineer_features import FEATURE_COLS
        return FEATURE_COLS
    except Exception:
        project_root = Path(__file__).resolve().parents[3]
        module_path = project_root / "ml" / "features" / "engineer_features.py"
        if not module_path.exists():
            return [
                "hour", "day_of_week", "month", "is_weekend",
                "is_morning", "is_afternoon", "is_evening", "is_night",
                "prev_lat", "prev_lng",
                "avg_movement_5", "log_movement",
                "feeding_distance_m", "avg_feeding_dist_5", "log_feeding_dist",
                "road_distance_m", "market_distance_m", "garbage_distance_m",
                "park_distance_m", "water_distance_m",
                "temperature_celsius", "humidity_percent", "rain_probability",
                "recent_zone_freq", "hour_freq", "dow_freq",
                "is_near_feeding", "is_near_market", "is_near_garbage",
                "animal_type_enc",
            ]
        spec = importlib.util.spec_from_file_location("ml_features", module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return list(module.FEATURE_COLS)


FEATURE_COLS = _resolve_feature_columns()
FEATURE_COUNT = len(FEATURE_COLS)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def _load_model():
    global _model, _model_meta
    if _model is not None:
        return _model

    model_dir = Path(settings.ML_MODEL_DIR)
    model_path = model_dir / "best_model.pkl"
    meta_path = model_dir / "best_model_meta.json"

    if model_path.exists():
        try:
            with open(model_path, "rb") as handle:
                _model = pickle.load(handle)
            if meta_path.exists():
                with open(meta_path, "r", encoding="utf-8") as handle:
                    _model_meta = json.load(handle)
            model_feature_count = getattr(_model, "n_features_in_", None)
            if model_feature_count is not None and model_feature_count != FEATURE_COUNT:
                raise ValueError(
                    f"Model expects {model_feature_count} features but runtime pipeline provides {FEATURE_COUNT}."
                )
            logger.info("ML model loaded: %s", _model_meta.get("model_name", "unknown"))
            return _model
        except Exception as exc:
            logger.error("Failed to load ML model: %s", exc)

    logger.warning("No compatible trained model available — using frequency baseline.")
    return None


async def get_prediction(
    animal_id: str,
    sightings: List[Dict],
    env_data: Dict,
    weather: Dict,
    target_hour: int = 8,
    target_day: Optional[int] = None,
    animal_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate a location prediction for an animal using the trained model when compatible."""
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
            target_hour, target_dow, prediction_date, animal_type=animal_type,
        )
    return await _frequency_baseline(
        animal_id, sightings, env_data, weather,
        target_hour, target_dow, prediction_date,
    )


async def _predict_with_model(
    model, animal_id, sightings, env_data, weather,
    target_hour, target_dow, prediction_date, animal_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Use the trained sklearn model with the exact canonical feature order."""
    import numpy as np

    features = _build_feature_vector(sightings, env_data, weather, target_hour, target_dow, animal_type=animal_type)
    X = np.asarray([[features.get(col, 0.0) for col in FEATURE_COLS]], dtype=float)

    try:
        expected = getattr(model, "n_features_in_", None)
        if expected is not None and expected != FEATURE_COUNT:
            raise ValueError(f"Model expects {expected} features but current feature vector has {FEATURE_COUNT}.")
        proba = model.predict_proba(X)[0]
        class_index = int(proba.argmax())
        confidence = float(proba.max())
        classes = getattr(model, "classes_", [])
        zone_id = classes[class_index] if len(classes) > class_index else "Z_unknown"
    except Exception as exc:
        logger.error("Model prediction failed: %s. Falling back to baseline.", exc)
        return await _frequency_baseline(
            animal_id, sightings, env_data, weather,
            target_hour, target_dow, prediction_date,
        )

    lat, lng = zone_id_to_center(zone_id) if zone_id.startswith("Z_") else (
        sightings[0].get("latitude", settings.DEFAULT_CITY_LAT),
        sightings[0].get("longitude", settings.DEFAULT_CITY_LNG),
    )

    return {
        "sufficient_data": True,
        "animal_id": animal_id,
        "prediction_date": str(prediction_date),
        "model_name": _model_meta.get("model_name", "trained_model"),
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
        "factors": _explain_factors(sightings, env_data, zone_id, target_hour),
        "top_features": {key: round(float(features.get(key, 0.0)), 3) for key in FEATURE_COLS[:10]},
        "training_sightings_used": len(sightings),
    }


async def _frequency_baseline(
    animal_id, sightings, env_data, weather,
    target_hour, target_dow, prediction_date,
) -> Dict[str, Any]:
    """Historical frequency baseline: most common zone at similar times."""
    similar = [
        s for s in sightings
        if abs(s.get("hour", 12) - target_hour) <= 2 and s.get("day_of_week", -1) == target_dow
    ]
    if not similar:
        similar = [s for s in sightings if abs(s.get("hour", 12) - target_hour) <= 2]
    if not similar:
        similar = sightings[:10]

    zones = [lat_lng_to_zone_id(s["latitude"], s["longitude"]) for s in similar]
    zone_counts = Counter(zones)
    top_zone = zone_counts.most_common(1)[0][0] if zone_counts else "Z_unknown"
    confidence = min(zone_counts.most_common(1)[0][1] / max(len(similar), 1), 1.0) if zone_counts else 0.3

    lat, lng = zone_id_to_center(top_zone) if top_zone.startswith("Z_") else (
        similar[0]["latitude"], similar[0]["longitude"],
    )

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
        "confidence": round(confidence * 0.8, 2),
        "confidence_label": _confidence_label(confidence * 0.8),
        "factors": _explain_factors(sightings, env_data, top_zone, target_hour),
        "top_features": {},
        "training_sightings_used": len(sightings),
    }


def _build_feature_vector(
    sightings: List[Dict],
    env_data: Dict,
    weather: Dict,
    target_hour: int,
    target_dow: int,
    animal_type: Optional[str] = None,
) -> Dict[str, float]:
    """Build the exact feature vector used by the training pipeline.
    Depends on the most recent historical sightings only and preserves strict ordering.
    """
    ordered = sorted(
        sightings,
        key=lambda item: item.get("timestamp") or datetime.utcnow(),
    )
    if not ordered:
        return {key: 0.0 for key in FEATURE_COLS}

    recent = ordered[-1]
    previous = ordered[-2] if len(ordered) > 1 else recent
    zone_hist = [lat_lng_to_zone_id(s["latitude"], s["longitude"]) for s in ordered[:20]]
    zone_counts = Counter(zone_hist)
    recent_zone_freq = zone_counts.most_common(1)[0][1] / max(len(zone_hist), 1) if zone_hist else 0.0

    movement_distances = []
    for idx in range(1, min(len(ordered), 10)):
        prev_sighting = ordered[idx - 1]
        current_sighting = ordered[idx]
        movement_distances.append(
            haversine_distance(
                prev_sighting.get("latitude", 0.0), prev_sighting.get("longitude", 0.0),
                current_sighting.get("latitude", 0.0), current_sighting.get("longitude", 0.0),
            )
        )

    avg_movement_5 = mean(movement_distances[-5:]) if movement_distances else 0.0
    log_movement = 0.0 if not movement_distances else __import__("math").log1p(movement_distances[-1])
    feeding_distance_m = _safe_float(recent.get("feeding_point_distance"), 500.0)
    avg_feeding_dist_5 = 0.0
    if any(s.get("feeding_point_distance") is not None for s in ordered[:5]):
        avg_feeding_dist_5 = mean([
            _safe_float(s.get("feeding_point_distance"), 0.0)
            for s in ordered[:5]
            if s.get("feeding_point_distance") is not None
        ])
    log_feeding_dist = __import__("math").log1p(feeding_distance_m)

    hour_freq = sum(1 for s in ordered if s.get("hour") == target_hour) / max(len(ordered), 1)
    dow_freq = sum(1 for s in ordered if int(s.get("day_of_week", target_dow)) == int(target_dow)) / max(len(ordered), 1)

    feature_map = {
        "hour": float(target_hour),
        "day_of_week": float(target_dow),
        "month": float(datetime.utcnow().month),
        "is_weekend": 1.0 if target_dow >= 5 else 0.0,
        "is_morning": 1.0 if 5 <= target_hour < 11 else 0.0,
        "is_afternoon": 1.0 if 11 <= target_hour < 17 else 0.0,
        "is_evening": 1.0 if 17 <= target_hour < 21 else 0.0,
        "is_night": 1.0 if target_hour >= 21 or target_hour < 5 else 0.0,
        "prev_lat": _safe_float(previous.get("latitude"), settings.DEFAULT_CITY_LAT),
        "prev_lng": _safe_float(previous.get("longitude"), settings.DEFAULT_CITY_LNG),
        "avg_movement_5": float(avg_movement_5),
        "log_movement": float(log_movement),
        "feeding_distance_m": float(feeding_distance_m),
        "avg_feeding_dist_5": float(avg_feeding_dist_5),
        "log_feeding_dist": float(log_feeding_dist),
        "road_distance_m": _safe_float(recent.get("road_distance"), 100.0),
        "market_distance_m": _safe_float(recent.get("market_distance"), 400.0),
        "garbage_distance_m": _safe_float(recent.get("garbage_point_distance"), 300.0),
        "park_distance_m": _safe_float(recent.get("park_distance"), 600.0),
        "water_distance_m": _safe_float(recent.get("water_source_distance"), 250.0),
        "temperature_celsius": _safe_float(weather.get("temperature_celsius"), 25.0),
        "humidity_percent": _safe_float(weather.get("humidity_percent"), 65.0),
        "rain_probability": _safe_float(weather.get("rain_probability"), 0.1),
        "recent_zone_freq": float(recent_zone_freq),
        "hour_freq": float(hour_freq),
        "dow_freq": float(dow_freq),
        "is_near_feeding": 1.0 if feeding_distance_m < 300 else 0.0,
        "is_near_market": 1.0 if _safe_float(recent.get("market_distance"), 400.0) < 300 else 0.0,
        "is_near_garbage": 1.0 if _safe_float(recent.get("garbage_point_distance"), 300.0) < 300 else 0.0,
        "animal_type_enc": 1.0 if str(animal_type or "").lower() == "dog" else 0.0,
    }
    return {key: float(feature_map.get(key, 0.0)) for key in FEATURE_COLS}


def _explain_factors(sightings, env_data, zone_id, target_hour) -> List[str]:
    """Generate human-readable explanation factors."""
    factors: List[str] = []
    zones = [lat_lng_to_zone_id(s["latitude"], s["longitude"]) for s in sightings]
    zone_counts = Counter(zones)
    if zone_id in zone_counts:
        count = zone_counts[zone_id]
        factors.append(f"Seen in this area {count} time{'s' if count != 1 else ''} previously")

    similar_hour = [s for s in sightings if abs(s.get("hour", -1) - target_hour) <= 1]
    if similar_hour:
        factors.append(f"Most sightings between {target_hour}–{target_hour + 2} hours")

    feeding_dists = [s.get("feeding_point_distance") for s in sightings[:5] if s.get("feeding_point_distance") is not None]
    if feeding_dists:
        nearest = min(feeding_dists)
        if nearest < 300:
            factors.append(f"Feeding point approx {int(nearest)} m away")
    return factors


def _zone_label(zone_id: str, sightings: List[Dict]) -> str:
    if zone_id.startswith("Z_"):
        return zone_id
    if sightings:
        return f"Zone around {sightings[0].get('latitude')}, {sightings[0].get('longitude')}"
    return "Unknown Zone"


def _confidence_label(confidence: float) -> str:
    if confidence >= 0.8:
        return "High"
    if confidence >= 0.5:
        return "Medium"
    return "Low"

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

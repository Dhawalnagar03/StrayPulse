from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from app.database.connection import get_database
from app.auth.jwt import get_current_user, get_current_ngo_or_admin
from app.schemas.prediction import PredictionResponse, PredictionInsufficientData, FeedingLocationCreate, FeedingLocationResponse
from app.services.ml_service import get_prediction
from app.services.weather import fetch_current_weather
from app.config import settings
import bson

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.get("/{animal_id}")
async def get_animal_prediction(
    animal_id: str,
    hour: int = Query(8, ge=0, le=23),
    current_user=Depends(get_current_user),
):
    """
    Get AI-generated location prediction for an animal.
    Returns prediction if enough sightings exist, otherwise explains data gap.
    """
    db = get_database()

    # Check animal exists
    animal = await db.animals.find_one({"animal_id": animal_id})
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    # Get sightings sorted by recency
    sightings = await db.sightings.find(
        {"animal_id": animal_id}
    ).sort("timestamp", -1).limit(200).to_list(200)

    if len(sightings) < settings.ML_MIN_SIGHTINGS_FOR_PREDICTION:
        return PredictionInsufficientData(
            animal_id=animal_id,
            message="Insufficient historical data for reliable prediction.",
            sightings_count=len(sightings),
            minimum_required=settings.ML_MIN_SIGHTINGS_FOR_PREDICTION,
            suggestion=(
                f"This animal needs at least {settings.ML_MIN_SIGHTINGS_FOR_PREDICTION} sightings. "
                f"Currently has {len(sightings)}. Continue reporting sightings to improve prediction accuracy."
            ),
        )

    # Check cache: if prediction generated within 3 hours, return cached
    from datetime import timedelta
    cached = await db.predictions.find_one(
        {"animal_id": animal_id},
        sort=[("generated_at", -1)]
    )
    if cached and (datetime.utcnow() - cached["generated_at"]).total_seconds() < 10800:
        return _prediction_to_response(cached)

    # Get environmental data
    env_locs = await db.environmental_locations.find({}).to_list(500)
    feeding_locs = await db.feeding_locations.find({}).to_list(200)
    env_data = {"environmental": env_locs, "feeding": feeding_locs}

    # Get weather at last known location
    last = sightings[0]
    weather = await fetch_current_weather(last["latitude"], last["longitude"])

    result = await get_prediction(
        animal_id=animal_id,
        sightings=sightings,
        env_data=env_data,
        weather=weather or {},
        target_hour=hour,
    )

    if not result.get("sufficient_data"):
        return PredictionInsufficientData(
            animal_id=animal_id,
            message="Insufficient historical data.",
            sightings_count=len(sightings),
            minimum_required=settings.ML_MIN_SIGHTINGS_FOR_PREDICTION,
            suggestion="Continue reporting sightings.",
        )

    # Save prediction to DB
    pred_doc = {
        "animal_id": animal_id,
        "prediction_date": result["prediction_date"],
        "model_name": result["model_name"],
        "model_version": result["model_version"],
        "predicted_zone_id": result["predicted_zone_id"],
        "predicted_zone_name": result.get("predicted_zone_name"),
        "predicted_latitude": result["latitude"],
        "predicted_longitude": result["longitude"],
        "prediction_radius_meters": result["prediction_radius_meters"],
        "time_start": result["time_start"],
        "time_end": result["time_end"],
        "confidence": result["confidence"],
        "confidence_label": result["confidence_label"],
        "factors": result["factors"],
        "top_features": result["top_features"],
        "training_sightings_used": result["training_sightings_used"],
        "is_demo": False,
        "is_valid": True,
        "generated_at": datetime.utcnow(),
    }
    await db.predictions.insert_one(pred_doc)

    return _prediction_to_response(pred_doc)


@router.get("/", response_model=List[PredictionResponse])
async def list_predictions(
    confidence_min: float = 0.0,
    limit: int = Query(20, le=100),
    current_user=Depends(get_current_user),
):
    db = get_database()
    cursor = db.predictions.find(
        {"confidence": {"$gte": confidence_min}, "is_valid": True}
    ).sort("generated_at", -1).limit(limit)
    preds = await cursor.to_list(limit)
    return [_prediction_to_response(p) for p in preds]


def _prediction_to_response(doc: dict) -> PredictionResponse:
    confidence = doc.get("confidence", 0)
    return PredictionResponse(
        animal_id=doc["animal_id"],
        prediction_date=str(doc.get("prediction_date", "")),
        model_name=doc.get("model_name", ""),
        model_version=doc.get("model_version", "1.0"),
        predicted_zone=doc.get("predicted_zone_name") or doc.get("predicted_zone_id", ""),
        predicted_zone_id=doc.get("predicted_zone_id", ""),
        latitude=doc.get("predicted_latitude", 0),
        longitude=doc.get("predicted_longitude", 0),
        prediction_radius_meters=doc.get("prediction_radius_meters", 500),
        time_start=doc.get("time_start", "07:00"),
        time_end=doc.get("time_end", "09:00"),
        confidence=confidence,
        confidence_label=doc.get("confidence_label", "Low"),
        confidence_percent=int(confidence * 100),
        factors=doc.get("factors", []),
        top_features=doc.get("top_features", {}),
        training_sightings_used=doc.get("training_sightings_used", 0),
        is_demo=doc.get("is_demo", False),
        generated_at=doc.get("generated_at", datetime.utcnow()).isoformat(),
    )

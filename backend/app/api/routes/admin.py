from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.database.connection import get_database
from app.auth.jwt import get_current_admin, get_current_user
from app.schemas.prediction import AnalyticsResponse

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(current_user=Depends(get_current_admin)):
    db = get_database()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_animals = await db.animals.count_documents({})
    total_sightings = await db.sightings.count_documents({})
    active_animals = await db.animals.count_documents({"status": "Active"})
    todays_sightings = await db.sightings.count_documents({"timestamp": {"$gte": today}})
    predictions_gen = await db.predictions.count_documents({})
    high_conf = await db.predictions.count_documents({"confidence": {"$gte": 0.70}})

    # Sightings by day of week (0=Mon..6=Sun)
    pipeline_day = [
        {"$group": {"_id": "$day_of_week", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    days_raw = await db.sightings.aggregate(pipeline_day).to_list(7)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    sightings_by_day = {day_names[r["_id"]]: r["count"] for r in days_raw if 0 <= r["_id"] <= 6}

    # Sightings by hour
    pipeline_hour = [
        {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    hours_raw = await db.sightings.aggregate(pipeline_hour).to_list(24)
    sightings_by_hour = {str(r["_id"]): r["count"] for r in hours_raw}

    # Animal distribution by type
    pipeline_type = [{"$group": {"_id": "$animal_type", "count": {"$sum": 1}}}]
    type_raw = await db.animals.aggregate(pipeline_type).to_list(10)
    animal_distribution = {r["_id"]: r["count"] for r in type_raw}

    # Top locations by sighting count (zone level)
    pipeline_zones = [
        {"$match": {"zone_id": {"$ne": None}}},
        {"$group": {"_id": "$zone_id", "count": {"$sum": 1}, "lat": {"$avg": "$latitude"}, "lng": {"$avg": "$longitude"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    zones_raw = await db.sightings.aggregate(pipeline_zones).to_list(10)
    top_locations = [{"zone": r["_id"], "count": r["count"], "lat": r["lat"], "lng": r["lng"]} for r in zones_raw]

    return AnalyticsResponse(
        total_animals=total_animals,
        total_sightings=total_sightings,
        active_animals=active_animals,
        todays_sightings=todays_sightings,
        predictions_generated=predictions_gen,
        high_confidence_predictions=high_conf,
        sightings_by_day=sightings_by_day,
        sightings_by_hour=sightings_by_hour,
        animal_distribution=animal_distribution,
        top_locations=top_locations,
    )


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = Query(20, le=100),
    current_user=Depends(get_current_admin),
):
    db = get_database()
    cursor = db.users.find({}, {"hashed_password": 0}).skip(skip).limit(limit)
    users = await cursor.to_list(limit)
    return [
        {
            "id": str(u["_id"]),
            "name": u["name"],
            "email": u["email"],
            "role": u["role"],
            "is_active": u.get("is_active", True),
            "total_sightings": u.get("total_sightings", 0),
            "created_at": u["created_at"].isoformat(),
        }
        for u in users
    ]


@router.get("/model-versions")
async def list_model_versions(current_user=Depends(get_current_admin)):
    db = get_database()
    cursor = db.model_versions.find({}).sort("created_at", -1).limit(20)
    versions = await cursor.to_list(20)
    return [
        {
            "id": str(v["_id"]),
            "model_name": v["model_name"],
            "version": v["version"],
            "training_date": v.get("training_date", "").isoformat() if v.get("training_date") else None,
            "training_samples": v.get("training_samples", 0),
            "accuracy": v.get("accuracy"),
            "f1_score": v.get("f1_score"),
            "mean_distance_error_km": v.get("mean_distance_error_km"),
            "is_active": v.get("is_active", False),
        }
        for v in versions
    ]


@router.get("/suspicious-sightings")
async def get_suspicious_sightings(current_user=Depends(get_current_admin)):
    db = get_database()
    cursor = db.sightings.find({"is_suspicious": True}).sort("created_at", -1).limit(50)
    sightings = await cursor.to_list(50)
    return [
        {
            "id": str(s["_id"]),
            "animal_id": s["animal_id"],
            "latitude": s["latitude"],
            "longitude": s["longitude"],
            "suspicious_reason": s.get("suspicious_reason"),
            "created_at": s["created_at"].isoformat(),
        }
        for s in sightings
    ]

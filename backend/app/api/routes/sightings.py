from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from app.database.connection import get_database
from app.auth.jwt import get_current_user, get_current_ngo_or_admin
from app.schemas.sighting import SightingCreateRequest, SightingVerifyRequest, SightingResponse
from app.models.sighting import TimeOfDay, VerificationStatus
from app.services.weather import fetch_current_weather
from app.services.geo import lat_lng_to_zone_id, nearest_distance, haversine_distance
from app.config import settings
import aiofiles, os, uuid, bson

router = APIRouter(prefix="/api/sightings", tags=["Sightings"])


def _time_of_day(hour: int) -> TimeOfDay:
    if 5 <= hour < 11:
        return TimeOfDay.MORNING
    elif 11 <= hour < 17:
        return TimeOfDay.AFTERNOON
    elif 17 <= hour < 21:
        return TimeOfDay.EVENING
    else:
        return TimeOfDay.NIGHT


@router.post("/", response_model=SightingResponse, status_code=201)
async def submit_sighting(
    req: SightingCreateRequest,
    current_user=Depends(get_current_user),
):
    db = get_database()

    # Validate animal
    animal = await db.animals.find_one({"animal_id": req.animal_id})
    if not animal:
        raise HTTPException(status_code=404, detail=f"Animal {req.animal_id} not found")

    ts = req.timestamp or datetime.utcnow()
    hour = ts.hour
    tod = _time_of_day(hour)
    zone_id = lat_lng_to_zone_id(req.latitude, req.longitude)

    # Fetch weather
    weather = await fetch_current_weather(req.latitude, req.longitude)

    # Environmental distances
    env_locs = await db.environmental_locations.find({}).to_list(500)
    feeding_locs = await db.feeding_locations.find({}).to_list(200)

    def get_nearest(env_type):
        filtered = [{"lat": l["latitude"], "lng": l["longitude"]}
                    for l in env_locs if l.get("env_type") == env_type]
        return nearest_distance(req.latitude, req.longitude, filtered)

    feeding_pts = [{"lat": l["latitude"], "lng": l["longitude"]} for l in feeding_locs]
    feeding_dist = nearest_distance(req.latitude, req.longitude, feeding_pts)

    # Data quality checks
    is_suspicious = False
    suspicious_reason = None

    # Check impossible movement speed (>80 km/h from last sighting)
    last_sighting = await db.sightings.find_one(
        {"animal_id": req.animal_id},
        sort=[("timestamp", -1)]
    )
    if last_sighting:
        time_diff = (ts - last_sighting["timestamp"]).total_seconds() / 3600.0
        if time_diff > 0:
            dist_km = haversine_distance(
                req.latitude, req.longitude,
                last_sighting["latitude"], last_sighting["longitude"]
            ) / 1000
            speed_kmh = dist_km / time_diff
            if speed_kmh > 80:
                is_suspicious = True
                suspicious_reason = f"Impossible movement speed: {speed_kmh:.1f} km/h"

    doc = {
        "animal_id": req.animal_id,
        "user_id": str(current_user["_id"]),
        "photo_url": None,
        "location": {"type": "Point", "coordinates": [req.longitude, req.latitude]},
        "latitude": req.latitude,
        "longitude": req.longitude,
        "gps_accuracy_meters": req.gps_accuracy_meters,
        "timestamp": ts,
        "day_of_week": ts.weekday(),
        "time_of_day": tod.value,
        "hour": hour,
        "weather_condition": weather.get("weather_condition") if weather else None,
        "temperature_celsius": weather.get("temperature_celsius") if weather else None,
        "humidity_percent": weather.get("humidity_percent") if weather else None,
        "rain_probability": weather.get("rain_probability") if weather else None,
        "wind_speed_kmh": weather.get("wind_speed_kmh") if weather else None,
        "feeding_point_distance": feeding_dist,
        "road_distance": get_nearest("road"),
        "market_distance": get_nearest("market"),
        "garbage_point_distance": get_nearest("garbage_point"),
        "park_distance": get_nearest("park"),
        "water_source_distance": get_nearest("water_source"),
        "zone_id": zone_id,
        "zone_name": None,
        "notes": req.notes,
        "is_feeding_point": req.is_feeding_point,
        "verification_status": VerificationStatus.PENDING.value,
        "verified_by": None,
        "verified_at": None,
        "is_suspicious": is_suspicious,
        "suspicious_reason": suspicious_reason,
        "is_demo": False,
        "created_at": datetime.utcnow(),
    }

    result = await db.sightings.insert_one(doc)

    # Update animal stats
    from collections import Counter
    all_sightings = await db.sightings.find({"animal_id": req.animal_id}).to_list(500)
    zones = [s.get("zone_id", "") for s in all_sightings]
    most_common = Counter(zones).most_common(1)

    await db.animals.update_one(
        {"animal_id": req.animal_id},
        {"$set": {
            "last_seen_at": ts,
            "last_seen_lat": req.latitude,
            "last_seen_lng": req.longitude,
            "status": "Active",
            "most_common_area": most_common[0][0] if most_common else None,
            "updated_at": datetime.utcnow(),
        },
        "$inc": {"total_sightings": 1}}
    )

    # Increment user sighting count
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"total_sightings": 1}}
    )

    doc["_id"] = result.inserted_id
    return _sighting_to_response(doc)


@router.post("/{sighting_id}/photo")
async def upload_sighting_photo(
    sighting_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    db = get_database()
    try:
        oid = bson.ObjectId(sighting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid sighting ID")

    sighting = await db.sightings.find_one({"_id": oid})
    if not sighting:
        raise HTTPException(status_code=404, detail="Sighting not found")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"sighting_{sighting_id}_{uuid.uuid4().hex}.jpg"
    path = os.path.join(settings.UPLOAD_DIR, filename)

    content = await file.read()
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    url = f"/uploads/{filename}"
    await db.sightings.update_one({"_id": oid}, {"$set": {"photo_url": url}})
    return {"photo_url": url}


@router.get("/animal/{animal_id}", response_model=List[SightingResponse])
async def get_animal_sightings(
    animal_id: str,
    skip: int = 0,
    limit: int = Query(50, le=200),
    current_user=Depends(get_current_user),
):
    db = get_database()
    cursor = db.sightings.find({"animal_id": animal_id}).sort("timestamp", -1).skip(skip).limit(limit)
    sightings = await cursor.to_list(length=limit)
    return [_sighting_to_response(s) for s in sightings]


@router.get("/nearby", response_model=List[SightingResponse])
async def get_nearby_sightings(
    lat: float,
    lng: float,
    radius_km: float = 2.0,
    limit: int = Query(30, le=100),
    current_user=Depends(get_current_user),
):
    db = get_database()
    cursor = db.sightings.find({
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": int(radius_km * 1000),
            }
        }
    }).limit(limit)
    sightings = await cursor.to_list(length=limit)
    return [_sighting_to_response(s) for s in sightings]


@router.put("/{sighting_id}/verify")
async def verify_sighting(
    sighting_id: str,
    req: SightingVerifyRequest,
    current_user=Depends(get_current_ngo_or_admin),
):
    db = get_database()
    try:
        oid = bson.ObjectId(sighting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid sighting ID")

    result = await db.sightings.update_one(
        {"_id": oid},
        {"$set": {
            "verification_status": req.status.value,
            "verified_by": str(current_user["_id"]),
            "verified_at": datetime.utcnow(),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sighting not found")
    return {"message": f"Sighting {req.status.value.lower()}"}


def _sighting_to_response(doc: dict) -> SightingResponse:
    return SightingResponse(
        id=str(doc["_id"]),
        animal_id=doc["animal_id"],
        user_id=doc["user_id"],
        photo_url=doc.get("photo_url"),
        latitude=doc["latitude"],
        longitude=doc["longitude"],
        gps_accuracy_meters=doc.get("gps_accuracy_meters"),
        timestamp=doc["timestamp"],
        day_of_week=doc["day_of_week"],
        time_of_day=TimeOfDay(doc["time_of_day"]),
        hour=doc["hour"],
        weather_condition=doc.get("weather_condition"),
        temperature_celsius=doc.get("temperature_celsius"),
        humidity_percent=doc.get("humidity_percent"),
        rain_probability=doc.get("rain_probability"),
        feeding_point_distance=doc.get("feeding_point_distance"),
        road_distance=doc.get("road_distance"),
        market_distance=doc.get("market_distance"),
        garbage_point_distance=doc.get("garbage_point_distance"),
        park_distance=doc.get("park_distance"),
        zone_id=doc.get("zone_id"),
        zone_name=doc.get("zone_name"),
        notes=doc.get("notes"),
        is_feeding_point=doc.get("is_feeding_point", False),
        verification_status=VerificationStatus(doc.get("verification_status", "Pending")),
        is_suspicious=doc.get("is_suspicious", False),
        is_demo=doc.get("is_demo", False),
        created_at=doc["created_at"],
    )

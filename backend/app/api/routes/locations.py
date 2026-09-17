from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database.connection import get_database
from app.auth.jwt import get_current_user, get_current_ngo_or_admin
from app.schemas.prediction import FeedingLocationCreate, FeedingLocationResponse, EnvironmentalLocationCreate
import bson

router = APIRouter(tags=["Locations"])


# ── Feeding Locations ─────────────────────────────────────────────────────────

feeding_router = APIRouter(prefix="/api/feeding-locations")


@feeding_router.post("/", response_model=FeedingLocationResponse, status_code=201)
async def create_feeding_location(
    req: FeedingLocationCreate,
    current_user=Depends(get_current_ngo_or_admin),
):
    db = get_database()
    doc = {
        "name": req.name,
        "location": {"type": "Point", "coordinates": [req.longitude, req.latitude]},
        "latitude": req.latitude,
        "longitude": req.longitude,
        "feeding_time": req.feeding_time,
        "feeding_frequency": req.feeding_frequency,
        "animal_ids": req.animal_ids,
        "notes": req.notes,
        "is_active": True,
        "is_demo": False,
        "created_by": str(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.feeding_locations.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _feeding_to_response(doc)


@feeding_router.get("/", response_model=List[FeedingLocationResponse])
async def list_feeding_locations(current_user=Depends(get_current_user)):
    db = get_database()
    cursor = db.feeding_locations.find({"is_active": True})
    locs = await cursor.to_list(200)
    return [_feeding_to_response(l) for l in locs]


@feeding_router.get("/{loc_id}", response_model=FeedingLocationResponse)
async def get_feeding_location(loc_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    try:
        oid = bson.ObjectId(loc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    doc = await db.feeding_locations.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return _feeding_to_response(doc)


def _feeding_to_response(doc: dict) -> FeedingLocationResponse:
    return FeedingLocationResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        latitude=doc["latitude"],
        longitude=doc["longitude"],
        feeding_time=doc.get("feeding_time"),
        feeding_frequency=doc.get("feeding_frequency"),
        animal_ids=doc.get("animal_ids", []),
        notes=doc.get("notes"),
        is_active=doc.get("is_active", True),
        is_demo=doc.get("is_demo", False),
        created_at=doc["created_at"],
    )


# ── Environmental Locations ──────────────────────────────────────────────────

env_router = APIRouter(prefix="/api/environment")


@env_router.post("/", status_code=201)
async def create_env_location(
    req: EnvironmentalLocationCreate,
    current_user=Depends(get_current_ngo_or_admin),
):
    db = get_database()
    doc = {
        "name": req.name,
        "env_type": req.env_type,
        "location": {"type": "Point", "coordinates": [req.longitude, req.latitude]},
        "latitude": req.latitude,
        "longitude": req.longitude,
        "description": req.description,
        "is_active": True,
        "is_demo": False,
        "created_at": datetime.utcnow(),
    }
    await db.environmental_locations.insert_one(doc)
    return {"message": "Environmental location created", "name": req.name}


@env_router.get("/")
async def list_env_locations(
    env_type: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    db = get_database()
    query = {}
    if env_type:
        query["env_type"] = env_type
    cursor = db.environmental_locations.find(query)
    locs = await cursor.to_list(500)
    return [
        {
            "id": str(l["_id"]),
            "name": l["name"],
            "env_type": l["env_type"],
            "latitude": l["latitude"],
            "longitude": l["longitude"],
            "description": l.get("description"),
            "is_demo": l.get("is_demo", False),
        }
        for l in locs
    ]

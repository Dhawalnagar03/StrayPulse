from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
import bson
from app.database.connection import get_database
from app.auth.jwt import get_current_user, get_current_ngo_or_admin, get_current_admin
from app.schemas.animal import AnimalCreateRequest, AnimalUpdateRequest, AnimalResponse, AnimalMatchResult
from app.services.cv_service import detect_animal, extract_features, match_animal
from app.config import settings
import aiofiles
import os
import uuid

router = APIRouter(prefix="/api/animals", tags=["Animals"])


def _next_animal_id_prefix(animal_type: str) -> str:
    prefix = animal_type.upper()[:3]
    if prefix in ("DOG", "CAT", "OTH"):
        return prefix
    return "ANM"


async def _generate_next_animal_id(db, animal_type: str) -> str:
    prefix = _next_animal_id_prefix(animal_type)
    cursor = db.animals.find({"animal_id": {"$regex": f"^{prefix}-\\d+"}}, {"animal_id": 1})
    docs = await cursor.to_list(length=10000)
    max_num = 0
    for doc in docs:
        try:
            parts = doc["animal_id"].split("-")
            if len(parts) >= 2:
                num = int(parts[1])
                if num > max_num:
                    max_num = num
        except (IndexError, ValueError):
            pass
    return f"{prefix}-{max_num + 1:05d}"


@router.post("/", response_model=AnimalResponse, status_code=201)
async def create_animal(
    req: AnimalCreateRequest,
    current_user=Depends(get_current_user),
):
    db = get_database()
    animal_id = await _generate_next_animal_id(db, req.animal_type.value)

    doc = {
        "animal_id": animal_id,
        "animal_type": req.animal_type.value,
        "name_label": req.name_label,
        "sex": req.sex.value,
        "approximate_age": req.approximate_age,
        "color": req.color,
        "breed": req.breed,
        "distinctive_features": req.distinctive_features,
        "primary_photo": req.primary_photo,
        "additional_photos": [],
        "status": "Active",
        "total_sightings": 0,
        "initial_lat": req.latitude,
        "initial_lng": req.longitude,
        "location_accuracy": req.location_accuracy,
        "notes": req.notes,
        "last_seen_at": datetime.utcnow() if (req.latitude and req.longitude) else None,
        "last_seen_lat": req.latitude,
        "last_seen_lng": req.longitude,
        "most_common_area": None,
        "is_demo": False,
        "created_by": str(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.animals.insert_one(doc)
    return _animal_to_response(doc)


@router.get("/count")
async def count_animals(current_user=Depends(get_current_user)):
    db = get_database()
    count = await db.animals.count_documents({})
    return {"count": count}


@router.get("/", response_model=List[AnimalResponse])
async def list_animals(
    animal_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=500),
    current_user=Depends(get_current_user),
):
    db = get_database()
    query: dict = {}
    if animal_type:
        query["animal_type"] = animal_type
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"animal_id": {"$regex": search, "$options": "i"}},
            {"name_label": {"$regex": search, "$options": "i"}},
            {"breed": {"$regex": search, "$options": "i"}},
            {"color": {"$regex": search, "$options": "i"}},
        ]

    cursor = db.animals.find(query).sort("created_at", -1).skip(skip).limit(limit)
    animals = await cursor.to_list(length=limit)
    return [_animal_to_response(a) for a in animals]


@router.get("/{animal_id}", response_model=AnimalResponse)
async def get_animal(animal_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    doc = await db.animals.find_one({"animal_id": animal_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Animal not found")
    return _animal_to_response(doc)


@router.put("/{animal_id}", response_model=AnimalResponse)
async def update_animal(
    animal_id: str,
    req: AnimalUpdateRequest,
    current_user=Depends(get_current_user),
):
    db = get_database()
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    result = await db.animals.find_one_and_update(
        {"animal_id": animal_id},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Animal not found")
    return _animal_to_response(result)


@router.delete("/{animal_id}")
async def delete_animal(
    animal_id: str,
    current_user=Depends(get_current_user),
):
    db = get_database()
    doc = await db.animals.find_one({"animal_id": animal_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Animal not found")

    sightings_count = await db.sightings.count_documents({"animal_id": animal_id})
    if sightings_count > 0:
        await db.animals.update_one(
            {"animal_id": animal_id},
            {"$set": {"status": "Archived", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Animal has historical sightings and has been archived.", "archived": True}
    else:
        await db.animals.delete_one({"animal_id": animal_id})
        return {"message": "Animal deleted successfully.", "deleted": True}


@router.post("/{animal_id}/photo")
async def upload_animal_photo(
    animal_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    db = get_database()
    doc = await db.animals.find_one({"animal_id": animal_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Animal not found")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{animal_id}_{uuid.uuid4().hex}.jpg"
    path = os.path.join(settings.UPLOAD_DIR, filename)

    content = await file.read()
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    url = f"/uploads/{filename}"
    await db.animals.update_one(
        {"animal_id": animal_id},
        {"$set": {"primary_photo": url, "updated_at": datetime.utcnow()}}
    )
    return {"photo_url": url, "animal_id": animal_id}


@router.post("/detect", summary="Detect and match animal from photo")
async def detect_and_match(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Step 1: YOLO detects animal type.
    Step 2: Extract features and compare with registered animals.
    Returns detection result + top matches.
    """
    content = await file.read()
    detection = await detect_animal(content)

    if not detection["animal_detected"]:
        return {
            "animal_detected": False,
            "message": "No animal detected in the image.",
            "matches": [],
        }

    query_features = await extract_features(content)

    db = get_database()
    # Get candidates of the same type
    candidates_cursor = db.animals.find(
        {"animal_type": detection["animal_type"]},
        {"animal_id": 1, "feature_vector": 1}
    ).limit(100)
    candidates = await candidates_cursor.to_list(100)

    candidate_features = [
        (c["animal_id"], c.get("feature_vector", query_features))
        for c in candidates
    ]

    matches = await match_animal(query_features, candidate_features, threshold=0.82)

    return {
        "animal_detected": True,
        "animal_type": detection["animal_type"],
        "detection_confidence": detection["confidence"],
        "detection_source": detection["source"],
        "matches": matches,
        "has_reliable_match": len(matches) > 0 and matches[0]["similarity_score"] >= 0.88,
    }


def _animal_to_response(doc: dict) -> AnimalResponse:
    from app.models.animal import AnimalType, AnimalSex, AnimalStatus
    return AnimalResponse(
        animal_id=doc["animal_id"],
        animal_type=AnimalType(doc["animal_type"]),
        name_label=doc.get("name_label"),
        sex=AnimalSex(doc.get("sex", "Unknown")),
        approximate_age=doc.get("approximate_age"),
        color=doc.get("color"),
        breed=doc.get("breed"),
        distinctive_features=doc.get("distinctive_features"),
        primary_photo=doc.get("primary_photo"),
        status=AnimalStatus(doc.get("status", "Active")),
        total_sightings=doc.get("total_sightings", 0),
        last_seen_at=doc.get("last_seen_at"),
        last_seen_lat=doc.get("last_seen_lat"),
        last_seen_lng=doc.get("last_seen_lng"),
        initial_lat=doc.get("initial_lat"),
        initial_lng=doc.get("initial_lng"),
        location_accuracy=doc.get("location_accuracy"),
        notes=doc.get("notes"),
        most_common_area=doc.get("most_common_area"),
        is_demo=doc.get("is_demo", False),
        created_at=doc["created_at"],
    )

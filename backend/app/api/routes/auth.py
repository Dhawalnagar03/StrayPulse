from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.connection import get_database
from app.auth.jwt import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.user import UserRegisterRequest, UserLoginRequest, TokenResponse, UserPublicResponse
from app.models.user import UserRole
from app.config import settings
import bson

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserPublicResponse, status_code=201)
async def register(req: UserRegisterRequest):
    db = get_database()

    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "hashed_password": hash_password(req.password),
        "role": req.role.value,
        "is_active": True,
        "is_verified": False,
        "profile_photo": None,
        "total_sightings": 0,
        "created_at": __import__("datetime").datetime.utcnow(),
        "updated_at": __import__("datetime").datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id

    return _user_to_response(doc)


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest):
    db = get_database()
    user = await db.users.find_one({"email": req.email})

    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Account is deactivated")

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})

    return TokenResponse(
        access_token=token,
        user_id=str(user["_id"]),
        role=user["role"],
        name=user["name"],
    )


@router.get("/me", response_model=UserPublicResponse)
async def me(current_user=Depends(get_current_user)):
    return _user_to_response(current_user)


@router.post("/logout")
async def logout():
    # JWT is stateless — client should discard token
    return {"message": "Logged out successfully"}


def _user_to_response(doc: dict) -> UserPublicResponse:
    return UserPublicResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        phone=doc.get("phone"),
        role=UserRole(doc["role"]),
        is_active=doc.get("is_active", True),
        total_sightings=doc.get("total_sightings", 0),
        created_at=doc["created_at"],
    )

from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.database.connection import get_database
from app.auth.jwt import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.user import UserRegisterRequest, UserLoginRequest, TokenResponse, UserPublicResponse
from app.models.user import UserRole
from app.config import settings
import bson

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _normalize_profile_type(role: str | None, profile_type: str | None) -> str:
    requested = (profile_type or role or "individual").strip().lower()
    valid_profile_types = {"individual", "ngo", "rescuer", "volunteer", "feeder"}
    if requested not in valid_profile_types:
        return "individual"
    return requested


@router.post("/register", response_model=UserPublicResponse, status_code=201)
async def register(req: UserRegisterRequest):
    db = get_database()

    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    normalized_profile_type = _normalize_profile_type(req.role.value if req.role else None, req.profile_type)
    normalized_role = "ngo" if normalized_profile_type == "ngo" else "citizen"
    if req.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Admin registration is not allowed")

    doc = {
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "hashed_password": hash_password(req.password),
        "role": normalized_role,
        "profile_type": normalized_profile_type,
        "organization_name": req.organization_name.strip() if req.organization_name else None,
        "organization_details": req.organization_details.strip() if req.organization_details else None,
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
    profile_type = user.get("profile_type") or _normalize_profile_type(user.get("role"), None)

    return TokenResponse(
        access_token=token,
        user_id=str(user["_id"]),
        role=user["role"],
        name=user["name"],
        profile_type=profile_type,
        organization_name=user.get("organization_name"),
    )


@router.get("/me", response_model=UserPublicResponse)
async def me(current_user=Depends(get_current_user)):
    return _user_to_response(current_user)


@router.post("/logout")
async def logout():
    # JWT is stateless — client should discard token
    return {"message": "Logged out successfully"}


@router.post(
    "/token",
    summary="Swagger / OAuth2 – obtain bearer token",
    description=(
        "OAuth2-compatible token endpoint for Swagger UI. "
        "Accepts `application/x-www-form-urlencoded` with `username` (your email) "
        "and `password`. Returns a bearer token you can use in the Authorize dialog. "
        "The regular JSON login endpoint (`POST /api/auth/login`) is unaffected."
    ),
    tags=["Authentication"],
    include_in_schema=True,
)
async def oauth2_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 password-grant token endpoint consumed by Swagger's Authorize dialog.

    ``username`` is normalised to lower-case and treated as the user's email address.
    Reuses the same password verification and JWT creation logic as the JSON login
    endpoint so there is no duplicated security logic.
    """
    db = get_database()
    email = form_data.username.strip().lower()
    user = await db.users.find_one({"email": email})

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated",
        )

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    # OAuth2 spec requires at minimum access_token + token_type.
    return {"access_token": token, "token_type": "bearer"}


def _user_to_response(doc: dict) -> UserPublicResponse:
    role_name = doc.get("role", "citizen")
    profile_type = doc.get("profile_type") or _normalize_profile_type(role_name, None)

    return UserPublicResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        phone=doc.get("phone"),
        role=UserRole(role_name),
        profile_type=profile_type,
        organization_name=doc.get("organization_name"),
        is_active=doc.get("is_active", True),
        total_sightings=doc.get("total_sightings", 0),
        created_at=doc["created_at"],
    )

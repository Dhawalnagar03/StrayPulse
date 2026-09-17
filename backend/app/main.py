import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.api.routes import auth, animals, sightings, predictions, locations, admin, ml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    await _seed_admin_if_missing()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("StrayPulse API started.")
    yield
    # Shutdown
    await close_mongo_connection()
    logger.info("StrayPulse API shutdown.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "StrayPulse — AI-Powered Stray Animal Location Prediction System. "
        "Crowdsourced sightings → movement pattern learning → future location prediction."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR, check_dir=False), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(animals.router)
app.include_router(sightings.router)
app.include_router(predictions.router)
app.include_router(locations.feeding_router)
app.include_router(locations.env_router)
app.include_router(admin.router)
app.include_router(ml.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    from app.database.connection import get_database
    try:
        db = get_database()
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "database": db_status}


async def _seed_admin_if_missing():
    """Create default admin user on first run."""
    from app.database.connection import get_database
    from app.auth.jwt import hash_password
    from datetime import datetime

    db = get_database()
    existing = await db.users.find_one({"email": settings.ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "name": "StrayPulse Admin",
            "email": settings.ADMIN_EMAIL,
            "phone": None,
            "hashed_password": hash_password(settings.ADMIN_PASSWORD),
            "role": "admin",
            "is_active": True,
            "is_verified": True,
            "profile_photo": None,
            "total_sightings": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
        logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")

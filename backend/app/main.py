import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from fastapi.openapi.utils import get_openapi
from app.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.database.seed import ensure_demo_users
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
    await ensure_demo_users()
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

# OAuth2 security scheme for Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    security_scheme = {
    "type": "http",
    "scheme": "bearer",
    "bearerFormat": "JWT"
}

    openapi_schema.setdefault("components", {}).setdefault(
        "securitySchemes", {}
    )["OAuth2PasswordBearer"] = security_scheme

    openapi_schema.setdefault("security", []).append(
        {"OAuth2PasswordBearer": []}
    )

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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


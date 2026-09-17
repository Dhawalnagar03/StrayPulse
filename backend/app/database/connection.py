from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global _client, _db
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.MONGODB_DB_NAME]
    await _ensure_indexes()
    logger.info(f"Connected to MongoDB database: {settings.MONGODB_DB_NAME}")


async def close_mongo_connection() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return _db


async def _ensure_indexes() -> None:
    """Create all required MongoDB indexes including geospatial."""
    db = get_database()

    # users
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")

    # animals
    await db.animals.create_index("animal_id", unique=True)
    await db.animals.create_index("animal_type")
    await db.animals.create_index("status")

    # sightings — geospatial + compound indexes
    await db.sightings.create_index([("location", "2dsphere")])
    await db.sightings.create_index("animal_id")
    await db.sightings.create_index("user_id")
    await db.sightings.create_index("timestamp")
    await db.sightings.create_index([("animal_id", 1), ("timestamp", -1)])
    await db.sightings.create_index("verification_status")

    # feeding_locations — geospatial
    await db.feeding_locations.create_index([("location", "2dsphere")])
    await db.feeding_locations.create_index("animal_ids")

    # environmental_locations — geospatial
    await db.environmental_locations.create_index([("location", "2dsphere")])
    await db.environmental_locations.create_index("env_type")

    # predictions
    await db.predictions.create_index("animal_id")
    await db.predictions.create_index([("animal_id", 1), ("prediction_date", -1)])

    # weather_data
    await db.weather_data.create_index([("lat", 1), ("lng", 1), ("timestamp", -1)])

    # model_versions
    await db.model_versions.create_index([("model_name", 1), ("version", -1)])

    logger.info("MongoDB indexes ensured.")

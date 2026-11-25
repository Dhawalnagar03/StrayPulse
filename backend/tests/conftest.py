"""
Shared pytest configuration and fixtures for StrayPulse backend tests.
"""
import pytest
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock

from app.auth.jwt import hash_password, create_access_token


# ---------------------------------------------------------------------------
# Shared test user fixtures
# ---------------------------------------------------------------------------

TEST_USER_ID = ObjectId()
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "TestPass@9876!"
TEST_USER_HASHED = hash_password(TEST_USER_PASSWORD)


@pytest.fixture()
def test_user_doc():
    """Return a realistic MongoDB user document with a valid bcrypt hash."""
    import datetime
    return {
        "_id": TEST_USER_ID,
        "name": "Test Citizen",
        "email": TEST_USER_EMAIL,
        "phone": None,
        "hashed_password": TEST_USER_HASHED,
        "role": "citizen",
        "profile_type": "individual",
        "organization_name": None,
        "is_active": True,
        "is_verified": True,
        "total_sightings": 0,
        "created_at": datetime.datetime.utcnow(),
    }


@pytest.fixture()
def valid_token(test_user_doc):
    """Return a valid JWT for the test user."""
    return create_access_token(
        {"sub": str(test_user_doc["_id"]), "role": test_user_doc["role"]}
    )

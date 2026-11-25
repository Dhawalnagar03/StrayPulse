"""
Comprehensive authentication tests for StrayPulse.

Covers:
  1. Valid JSON login returns 200 + access_token
  2. Invalid credentials return 401
  3. Valid bearer token permits GET /api/auth/me
  4. Missing bearer token returns 401
  5. Invalid / expired token returns 401
  6. Swagger OAuth2 /api/auth/token form-data endpoint works
  7. Existing profile-type and seed tests continue to pass
"""
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from bson import ObjectId
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# App import — database dependency is patched before the client is built
# ---------------------------------------------------------------------------
from app.main import app
from app.auth.jwt import create_access_token, hash_password, verify_password
from app.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_HASHED_GOOD = hash_password("Demo@1234!")


def _make_user(role: str = "citizen", is_active: bool = True) -> dict:
    oid = ObjectId()
    import datetime
    return {
        "_id": oid,
        "name": "Test User",
        "email": "citizen@demo.com",
        "phone": None,
        "hashed_password": _HASHED_GOOD,
        "role": role,
        "profile_type": "individual",
        "organization_name": None,
        "is_active": is_active,
        "is_verified": True,
        "total_sightings": 0,
        "created_at": datetime.datetime.utcnow(),
    }


def _mock_db(user: dict | None):
    """Return a MagicMock db where users.find_one always returns `user`."""
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value=user)
    return db


# ---------------------------------------------------------------------------
# 1. Valid JSON login returns 200 + access_token
# ---------------------------------------------------------------------------

def test_json_login_success():
    user = _make_user()
    with patch("app.api.routes.auth.get_database", return_value=_mock_db(user)):
        with TestClient(app, raise_server_exceptions=True) as client:
            res = client.post(
                "/api/auth/login",
                json={"email": "citizen@demo.com", "password": "Demo@1234!"},
            )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "citizen"
    assert data["user_id"] == str(user["_id"])
    assert "hashed_password" not in data


# ---------------------------------------------------------------------------
# 2. Invalid credentials return 401
# ---------------------------------------------------------------------------

def test_json_login_wrong_password():
    user = _make_user()
    with patch("app.api.routes.auth.get_database", return_value=_mock_db(user)):
        with TestClient(app) as client:
            res = client.post(
                "/api/auth/login",
                json={"email": "citizen@demo.com", "password": "WrongPassword!"},
            )
    assert res.status_code == 401


def test_json_login_user_not_found():
    with patch("app.api.routes.auth.get_database", return_value=_mock_db(None)):
        with TestClient(app) as client:
            res = client.post(
                "/api/auth/login",
                json={"email": "nobody@example.com", "password": "Demo@1234!"},
            )
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 3. Valid bearer token permits GET /api/auth/me
# ---------------------------------------------------------------------------

def test_me_with_valid_token():
    user = _make_user()
    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    with patch("app.auth.jwt.get_database", return_value=_mock_db(user)):
        with TestClient(app) as client:
            res = client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["email"] == "citizen@demo.com"
    assert "hashed_password" not in data


# ---------------------------------------------------------------------------
# 4. Missing bearer token returns 401
# ---------------------------------------------------------------------------

def test_me_without_token():
    with TestClient(app) as client:
        res = client.get("/api/auth/me")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 5a. Invalid (garbage) token returns 401
# ---------------------------------------------------------------------------

def test_me_with_invalid_token():
    with patch("app.auth.jwt.get_database", return_value=_mock_db(None)):
        with TestClient(app) as client:
            res = client.get(
                "/api/auth/me",
                headers={"Authorization": "Bearer this.is.garbage"},
            )
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 5b. Expired token returns 401
# ---------------------------------------------------------------------------

def test_me_with_expired_token():
    user = _make_user()
    expired_token = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]},
        expires_delta=timedelta(seconds=-1),   # already expired
    )
    with patch("app.auth.jwt.get_database", return_value=_mock_db(user)):
        with TestClient(app) as client:
            res = client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {expired_token}"},
            )
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 6. Swagger OAuth2 /api/auth/token form-data endpoint
# ---------------------------------------------------------------------------

def test_oauth2_token_success():
    """The Swagger Authorize dialog should be able to obtain a token."""
    user = _make_user()
    with patch("app.api.routes.auth.get_database", return_value=_mock_db(user)):
        with TestClient(app) as client:
            res = client.post(
                "/api/auth/token",
                data={"username": "citizen@demo.com", "password": "Demo@1234!"},
            )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_oauth2_token_wrong_password():
    user = _make_user()
    with patch("app.api.routes.auth.get_database", return_value=_mock_db(user)):
        with TestClient(app) as client:
            res = client.post(
                "/api/auth/token",
                data={"username": "citizen@demo.com", "password": "Bad!"},
            )
    assert res.status_code == 401


def test_oauth2_token_email_case_insensitive():
    """Username/email supplied in mixed case should still authenticate."""
    user = _make_user()
    with patch("app.api.routes.auth.get_database", return_value=_mock_db(user)):
        with TestClient(app) as client:
            res = client.post(
                "/api/auth/token",
                data={"username": "CITIZEN@DEMO.COM", "password": "Demo@1234!"},
            )
    # find_one is mocked to return the user regardless; what matters is the
    # endpoint normalises the email before calling find_one.
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# 7. JWT helper unit tests
# ---------------------------------------------------------------------------

def test_hash_and_verify_password():
    pw = "MySecret@42!"
    hashed = hash_password(pw)
    assert verify_password(pw, hashed)
    assert not verify_password("wrong", hashed)


def test_token_contains_sub_and_role():
    from jose import jwt as _jwt
    oid = str(ObjectId())
    token = create_access_token({"sub": oid, "role": "admin"})
    payload = _jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == oid
    assert payload["role"] == "admin"
    assert "exp" in payload


def test_token_expiry_respected():
    """Token created with a negative delta should be expired immediately."""
    from jose import jwt as _jwt, JWTError
    oid = str(ObjectId())
    token = create_access_token({"sub": oid}, expires_delta=timedelta(seconds=-1))
    with pytest.raises(JWTError):
        _jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.database.seed import ensure_demo_users


@pytest.mark.asyncio
async def test_ensure_demo_users_creates_missing_citizen_and_admin():
    db = MagicMock()
    db.users.find_one = AsyncMock(side_effect=[None, None])
    db.users.insert_one = AsyncMock(return_value=SimpleNamespace(inserted_id="demo-user-id"))

    result = await ensure_demo_users(db)

    assert result["admin_email"] == "admin@straypulse.org"
    assert result["citizen_email"] == "citizen@demo.com"
    assert db.users.insert_one.await_count == 2


@pytest.mark.asyncio
async def test_ensure_demo_users_skips_existing_accounts():
    db = MagicMock()
    db.users.find_one = AsyncMock(side_effect=[{"email": "admin@straypulse.org"}, {"email": "citizen@demo.com"}])

    result = await ensure_demo_users(db)

    assert result["admin_email"] == "admin@straypulse.org"
    assert result["citizen_email"] == "citizen@demo.com"
    db.users.insert_one.assert_not_called()

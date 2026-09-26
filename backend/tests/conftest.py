import os
import uuid
from unittest import mock

import mongomock
import pytest
from fastapi.testclient import TestClient

# Set before main.py is imported so nothing can point at a real database.
os.environ["MONGO_URI"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "wattshare_test"

PARTIAL_UNIQUE_INDEXES = ("email", "phone")


@pytest.fixture(scope="session")
def main_module():
    # main.py creates its MongoClient at import time, so the patch has to be active for the import.
    with mock.patch("pymongo.MongoClient", mongomock.MongoClient):
        import main
    return main


@pytest.fixture(autouse=True)
def fresh_database(main_module, monkeypatch):
    """Give every test its own empty in-memory database and point main.py at it."""
    client = mongomock.MongoClient()
    database = client["wattshare_test"]

    monkeypatch.setattr(main_module, "client", client)
    monkeypatch.setattr(main_module, "db", database)
    for attribute, collection in list(vars(main_module).items()):
        if attribute.endswith("_collection") and hasattr(collection, "name"):
            monkeypatch.setattr(main_module, attribute, database[collection.name])

    for field in PARTIAL_UNIQUE_INDEXES:
        database["users"].create_index(
            field, unique=True, partialFilterExpression={field: {"$type": "string"}}
        )

    yield database
    client.close()


@pytest.fixture
def client(main_module):
    with TestClient(main_module.app) as test_client:
        yield test_client


@pytest.fixture
def make_user(fresh_database):
    """Insert a user with the given role and return its id plus ready-to-use auth headers."""
    from auth import create_access_token

    def _make_user(role, name=None):
        unique = uuid.uuid4().hex[:8]
        inserted = fresh_database["users"].insert_one(
            {
                "name": name or f"Test {role.capitalize()}",
                "email": f"{role}-{unique}@x.com",
                "phone": None,
                "password": "not-a-real-hash",
                "role": role,
            }
        )
        user_id = str(inserted.inserted_id)
        token = create_access_token({"id": user_id, "role": role})
        return {"id": user_id, "headers": {"Authorization": f"Bearer {token}"}}

    return _make_user

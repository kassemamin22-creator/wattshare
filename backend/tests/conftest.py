import os
import uuid
from types import SimpleNamespace
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


class FakeGemini:
    """Stands in for the google-genai client.

    Script it with `reply_text` (or `error` to make every call raise), then inspect what the app
    sent through `generate_calls` (OCR), `chat_create_calls` (chatbot setup) and `sent_messages`.
    """

    def __init__(self):
        self.reply_text = "OK"
        self.error = None
        self.generate_calls = []
        self.chat_create_calls = []
        self.sent_messages = []
        self.models = SimpleNamespace(generate_content=self._generate_content)
        self.chats = SimpleNamespace(create=self._create_chat)

    def _reply(self):
        if self.error is not None:
            raise self.error
        return SimpleNamespace(text=self.reply_text)

    def _generate_content(self, **kwargs):
        self.generate_calls.append(kwargs)
        return self._reply()

    def _create_chat(self, **kwargs):
        self.chat_create_calls.append(kwargs)
        return SimpleNamespace(send_message=self._send_message)

    def _send_message(self, message):
        self.sent_messages.append(message)
        return self._reply()


@pytest.fixture
def fake_gemini(main_module, monkeypatch):
    """Replace `genai` inside main.py so `genai.Client(...)` returns one shared FakeGemini.

    Only the name main.py sees is swapped (monkeypatch undoes it after the test), so no test can
    reach the real API or needs GEMINI_API_KEY. `google.genai.types` stays real, which means the
    recorded calls contain the genuine Content/Part objects the app built.
    """
    fake = FakeGemini()
    monkeypatch.setattr(main_module, "genai", SimpleNamespace(Client=lambda *args, **kwargs: fake))
    return fake


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

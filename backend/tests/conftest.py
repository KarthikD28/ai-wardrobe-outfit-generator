import io
import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="wardrobe-test-"))
os.environ["WARDROBE_DATABASE_URL"] = f"sqlite:///{_tmp / 'test.db'}"
os.environ["WARDROBE_MEDIA_DIR"] = str(_tmp / "media")
os.environ["WARDROBE_REMOVE_BACKGROUNDS"] = "false"

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.db import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


@pytest.fixture
def client():
    return TestClient(app)


def register(client: TestClient, email: str = "a@example.com") -> dict[str, str]:
    res = client.post(
        "/api/auth/register", json={"email": email, "password": "password123", "gender": "male"}
    )
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def auth(client):
    return register(client)


def png_bytes(rgb: tuple[int, int, int]) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), rgb).save(buf, format="PNG")
    return buf.getvalue()


def add_item(client: TestClient, headers: dict, rgb=(200, 20, 20), **fields) -> dict:
    data = {"category": "top", **fields}
    res = client.post(
        "/api/items",
        headers=headers,
        data=data,
        files={"photo": ("item.png", png_bytes(rgb), "image/png")},
    )
    assert res.status_code == 201, res.text
    return res.json()

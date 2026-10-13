from PIL import Image

from app.color import color_name, dominant_color

from .conftest import add_item, register


def test_register_login_and_profile(client):
    headers = register(client)
    assert client.get("/api/auth/me", headers=headers).json()["gender"] == "male"

    res = client.patch("/api/auth/me", headers=headers, json={"gender": "female"})
    assert res.json()["gender"] == "female"

    login = client.post(
        "/api/auth/login", json={"email": "A@example.com", "password": "password123"}
    )
    assert login.status_code == 200
    bad = client.post("/api/auth/login", json={"email": "a@example.com", "password": "nope-nope"})
    assert bad.status_code == 401


def test_duplicate_email_rejected(client, auth):
    res = client.post(
        "/api/auth/register",
        json={"email": "a@example.com", "password": "password123", "gender": "female"},
    )
    assert res.status_code == 409


def test_requires_login(client):
    assert client.get("/api/items").status_code == 401


def test_upload_detects_color_and_serves_image(client, auth):
    item = add_item(client, auth, rgb=(20, 40, 200), fit="oversized", pattern="graphic", name="Tee")
    assert item["color"] == "blue"
    assert item["fit"] == "oversized"
    assert item["pattern"] == "graphic"
    assert client.get(item["image_url"]).status_code == 200
    assert [i["id"] for i in client.get("/api/items", headers=auth).json()] == [item["id"]]


def test_upload_rejects_non_image(client, auth):
    res = client.post(
        "/api/items",
        headers=auth,
        data={"category": "top"},
        files={"photo": ("x.png", b"not an image", "image/png")},
    )
    assert res.status_code == 422


def test_edit_and_delete_item(client, auth):
    item = add_item(client, auth)
    res = client.patch(f"/api/items/{item['id']}", headers=auth, json={"color": "navy"})
    assert res.json()["color"] == "navy"
    assert client.delete(f"/api/items/{item['id']}", headers=auth).status_code == 204
    assert client.get(item["image_url"]).status_code == 404


def test_items_are_private_to_their_owner(client, auth):
    item = add_item(client, auth)
    other = register(client, "b@example.com")
    assert client.get("/api/items", headers=other).json() == []
    assert client.delete(f"/api/items/{item['id']}", headers=other).status_code == 404
    res = client.post("/api/outfits", headers=other, json={"item_ids": [item["id"], 999]})
    assert res.status_code == 422


def test_save_and_list_outfits(client, auth):
    top = add_item(client, auth)
    bottom = add_item(client, auth, rgb=(10, 10, 10), category="bottom")
    res = client.post(
        "/api/outfits", headers=auth, json={"item_ids": [top["id"], bottom["id"]], "note": "hi"}
    )
    assert res.status_code == 201
    assert [i["id"] for i in res.json()["items"]] == [top["id"], bottom["id"]]

    # Deleting a piece drops the now-incomplete outfit from the feed.
    client.delete(f"/api/items/{bottom['id']}", headers=auth)
    assert client.get("/api/outfits", headers=auth).json() == []


def test_color_names():
    assert color_name((5, 5, 5)) == "black"
    assert color_name((250, 250, 250)) == "white"
    assert color_name((128, 128, 128)) == "gray"
    assert color_name((20, 30, 70)) == "navy"
    assert color_name((90, 55, 30)) == "brown"
    assert color_name((215, 195, 165)) == "beige"
    assert color_name((220, 30, 30)) == "red"
    assert color_name((30, 160, 60)) == "green"


def test_dominant_color_ignores_transparent_pixels():
    image = Image.new("RGBA", (40, 40), (0, 255, 0, 0))
    image.paste((200, 20, 20, 255), (0, 0, 10, 10))
    assert color_name(dominant_color(image)) == "red"

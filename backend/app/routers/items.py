from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select

from ..auth import CurrentUser, Db
from ..config import settings
from ..images import InvalidImage, delete_image, process_upload
from ..models import Item, User
from ..schemas import Category, Fit, ItemOut, ItemUpdate, Pattern

router = APIRouter(prefix="/items", tags=["items"])


def get_owned_item(item_id: int, user: User, db: Db) -> Item:
    item = db.get(Item, item_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item


@router.get("", response_model=list[ItemOut])
def list_items(user: CurrentUser, db: Db):
    return db.scalars(
        select(Item).where(Item.user_id == user.id).order_by(Item.created_at.desc(), Item.id.desc())
    ).all()


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    user: CurrentUser,
    db: Db,
    photo: Annotated[UploadFile, File()],
    category: Annotated[Category, Form()],
    fit: Annotated[Fit, Form()] = "regular",
    pattern: Annotated[Pattern, Form()] = "solid",
    name: Annotated[str, Form(max_length=80)] = "",
):
    data = await photo.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Photo is too large")
    try:
        processed = await run_in_threadpool(process_upload, data)
    except InvalidImage as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    item = Item(
        user_id=user.id,
        name=name.strip(),
        image_file=processed.filename,
        category=category,
        fit=fit,
        pattern=pattern,
        color=processed.color,
        color_hex=processed.color_hex,
        background_removed=processed.background_removed,
    )
    db.add(item)
    db.commit()
    return item


@router.patch("/{item_id}", response_model=ItemOut)
def update_item(item_id: int, body: ItemUpdate, user: CurrentUser, db: Db):
    item = get_owned_item(item_id, user, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, user: CurrentUser, db: Db):
    item = get_owned_item(item_id, user, db)
    filename = item.image_file
    db.delete(item)
    db.commit()
    delete_image(filename)

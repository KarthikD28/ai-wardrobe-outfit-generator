from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..auth import CurrentUser, Db
from ..models import Item, Outfit
from ..schemas import OutfitCreate, OutfitOut

router = APIRouter(prefix="/outfits", tags=["outfits"])


@router.get("", response_model=list[OutfitOut])
def list_outfits(user: CurrentUser, db: Db):
    outfits = db.scalars(
        select(Outfit)
        .where(Outfit.user_id == user.id)
        .options(selectinload(Outfit.items))
        .order_by(Outfit.created_at.desc(), Outfit.id.desc())
    ).all()
    # An outfit that lost pieces to wardrobe deletions is no longer wearable.
    return [o for o in outfits if len(o.items) >= 2]


@router.post("", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def save_outfit(body: OutfitCreate, user: CurrentUser, db: Db):
    ids = list(dict.fromkeys(body.item_ids))
    items = db.scalars(select(Item).where(Item.user_id == user.id, Item.id.in_(ids))).all()
    if len(items) != len(ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown item in outfit")
    by_id = {item.id: item for item in items}
    outfit = Outfit(user_id=user.id, note=body.note, items=[by_id[i] for i in ids])
    db.add(outfit)
    db.commit()
    return outfit


@router.delete("/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(outfit_id: int, user: CurrentUser, db: Db):
    outfit = db.get(Outfit, outfit_id)
    if outfit is None or outfit.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Outfit not found")
    db.delete(outfit)
    db.commit()

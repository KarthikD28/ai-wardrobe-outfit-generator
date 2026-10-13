from datetime import UTC, datetime

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


outfit_items = Table(
    "outfit_items",
    Base.metadata,
    Column("outfit_id", ForeignKey("outfits.id", ondelete="CASCADE"), primary_key=True),
    Column("item_id", ForeignKey("items.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    gender: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    items: Mapped[list["Item"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    outfits: Mapped[list["Outfit"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80), default="")
    image_file: Mapped[str] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(20))
    fit: Mapped[str] = mapped_column(String(20))
    pattern: Mapped[str] = mapped_column(String(20))
    color: Mapped[str] = mapped_column(String(20))
    color_hex: Mapped[str] = mapped_column(String(7))
    background_removed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    user: Mapped[User] = relationship(back_populates="items")


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    user: Mapped[User] = relationship(back_populates="outfits")
    items: Mapped[list[Item]] = relationship(secondary=outfit_items)

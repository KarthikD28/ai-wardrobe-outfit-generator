from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

Gender = Literal["male", "female"]
Category = Literal["top", "layer", "outerwear", "bottom", "dress", "shoes", "accessory"]
Fit = Literal["slim", "regular", "oversized"]
Pattern = Literal["solid", "patterned", "graphic"]
Color = Literal[
    "black", "white", "gray", "beige", "brown", "navy",
    "red", "orange", "yellow", "green", "blue", "purple", "pink",
]  # fmt: skip


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    gender: Gender


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    gender: Gender


class UserUpdate(BaseModel):
    gender: Gender


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    image_file: str = Field(exclude=True)
    category: Category
    fit: Fit
    pattern: Pattern
    color: Color
    color_hex: str
    background_removed: bool
    created_at: datetime

    @computed_field
    @property
    def image_url(self) -> str:
        return f"/media/{self.image_file}"


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    category: Category | None = None
    fit: Fit | None = None
    pattern: Pattern | None = None
    color: Color | None = None


class OutfitCreate(BaseModel):
    item_ids: list[int] = Field(min_length=2, max_length=8)
    note: str = Field(default="", max_length=300)


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    note: str
    created_at: datetime
    items: list[ItemOut]

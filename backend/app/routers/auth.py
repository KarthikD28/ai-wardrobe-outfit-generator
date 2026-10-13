from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..auth import CurrentUser, Db, create_token, hash_password, verify_password
from ..models import User
from ..schemas import LoginRequest, RegisterRequest, TokenOut, UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenOut:
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Db):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")
    user = User(email=email, password_hash=hash_password(body.password), gender=body.gender)
    db.add(user)
    db.commit()
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Db):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: UserUpdate, user: CurrentUser, db: Db):
    user.gender = body.gender
    db.commit()
    return user

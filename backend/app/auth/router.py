from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.schemas import LoginRequest, RegisterRequest, UserOut
from app.common.config import get_settings
from app.common.database import get_db
from app.common.deps import get_current_user
from app.common.enums import UserRole
from app.common.errors import ConflictError, UnauthorizedError
from app.common.security import create_access_token, hash_password, verify_password
from app.users.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure or settings.is_production,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(key=settings.cookie_name, path="/")


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.lower().strip()
    username = payload.username.strip()

    existing_email = db.scalar(select(User).where(func.lower(User.email) == email))
    if existing_email:
        raise ConflictError("An account with this email already exists.")

    existing_username = db.scalar(select(User).where(func.lower(User.username) == username.lower()))
    if existing_username:
        raise ConflictError("This username is already taken.")

    user = User(
        email=email,
        username=username,
        password_hash=hash_password(payload.password),
        role=UserRole.USER.value,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _set_auth_cookie(response, create_access_token(user.id))
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("Invalid email or password.")
    _set_auth_cookie(response, create_access_token(user.id))
    return user


@router.post("/logout")
def logout(response: Response) -> dict:
    _clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

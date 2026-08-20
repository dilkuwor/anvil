from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.schemas import (
    LlmProbeOut,
    LoginRequest,
    RegisterRequest,
    UpdateLlmSettingsRequest,
    UpdateProfileRequest,
    UserOut,
)
from app.common.config import get_settings
from app.common.database import get_db
from app.common.deps import get_current_user, get_optional_user
from app.common.enums import UserRole
from app.common.errors import AppError, ConflictError, NotFoundError, UnauthorizedError
from app.common.secrets import encrypt_secret, secret_hint
from app.common.security import create_access_token, hash_password, verify_password
from app.interviews.providers import normalize_provider_name
from app.interviews.providers.probe import probe_llm_for_user
from app.users.models import User, UserLlmKey

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_BYTES = 1_000_000

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
    username = payload.username.strip()
    user = db.scalar(select(User).where(func.lower(User.username) == username.lower()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("Invalid username or password.")
    _set_auth_cookie(response, create_access_token(user.id))
    return user


@router.post("/logout")
def logout(response: Response) -> dict:
    _clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut | None)
def me(current_user: User | None = Depends(get_optional_user)) -> User | None:
    return current_user


@router.post("/me/llm/test", response_model=LlmProbeOut)
def test_my_llm_settings(current_user: User = Depends(get_current_user)) -> LlmProbeOut:
    return LlmProbeOut.model_validate(probe_llm_for_user(current_user))


@router.patch("/me/llm", response_model=UserOut)
def update_my_llm_settings(
    payload: UpdateLlmSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    selected = current_user.llm_provider
    if "provider" in payload.model_fields_set:
        try:
            selected = normalize_provider_name(payload.provider)
        except ValueError as exc:
            raise AppError(str(exc), status_code=422, code="invalid_llm_provider") from exc
        current_user.llm_provider = selected
    key_provider = selected
    if payload.clear_api_key:
        if key_provider:
            row = current_user.llm_key_for(key_provider)
            if row is not None:
                db.delete(row)
    elif payload.api_key and key_provider:
        row = current_user.llm_key_for(key_provider)
        if row is None:
            row = UserLlmKey(user_id=current_user.id, provider=key_provider)
            current_user.llm_keys.append(row)
        row.api_key_encrypted = encrypt_secret(payload.api_key)
        row.api_key_hint = secret_hint(payload.api_key)
    if "model" in payload.model_fields_set and key_provider and not payload.clear_api_key:
        row = current_user.llm_key_for(key_provider)
        if row is None:
            raise AppError(
                "Save an API key for this provider before choosing a model.",
                status_code=422,
                code="llm_api_key_required",
            )
        row.model = payload.model
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    username = payload.username.strip()
    taken = db.scalar(
        select(User).where(func.lower(User.username) == username.lower(), User.id != current_user.id)
    )
    if taken:
        raise ConflictError("This username is already taken.")
    current_user.username = username
    current_user.display_name = payload.display_name
    current_user.linkedin_url = payload.linkedin_url
    current_user.github_url = payload.github_url
    current_user.website_url = payload.website_url
    current_user.country = payload.country
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/avatar")
def get_my_avatar(current_user: User = Depends(get_current_user)) -> Response:
    if not current_user.avatar_bytes or not current_user.avatar_content_type:
        raise NotFoundError("No profile picture uploaded.")
    return Response(
        content=current_user.avatar_bytes,
        media_type=current_user.avatar_content_type,
        headers={"Cache-Control": "private, max-age=60"},
    )


@router.put("/me/avatar", response_model=UserOut)
async def upload_my_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise AppError("Use a JPEG, PNG, or WebP image.", status_code=422, code="invalid_avatar")
    data = await file.read()
    if not data:
        raise AppError("The image file is empty.", status_code=422, code="invalid_avatar")
    if len(data) > MAX_AVATAR_BYTES:
        raise AppError("Profile pictures must be 1 MB or smaller.", status_code=422, code="invalid_avatar")
    current_user.avatar_bytes = data
    current_user.avatar_content_type = content_type
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserOut)
def delete_my_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    current_user.avatar_bytes = None
    current_user.avatar_content_type = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

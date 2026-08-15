from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.common.config import get_settings
from app.common.database import get_db
from app.common.errors import UnauthorizedError
from app.common.security import decode_access_token
from app.users.models import User


def get_token_from_request(request: Request) -> str | None:
    settings = get_settings()
    cookie_token = request.cookies.get(settings.cookie_name)
    if cookie_token:
        return cookie_token
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.removeprefix("Bearer ").strip()
    return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = get_token_from_request(request)
    if not token:
        raise UnauthorizedError()
    try:
        user_id: UUID = decode_access_token(token)
    except Exception as exc:
        raise UnauthorizedError("Invalid or expired session.") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Invalid or expired session.")
    return user

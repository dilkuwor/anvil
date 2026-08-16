from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.errors import NotFoundError
from app.progress import service as progress_service
from app.users.models import User
from app.users.schemas import PublicProfileOut, PublicProgressOut, PublicUserOut

router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _public_user(username: str, db: Session) -> User:
    user = db.scalar(select(User).where(func.lower(User.username) == username.lower(), User.is_active.is_(True)))
    if user is None:
        raise NotFoundError("User not found.")
    return user


@router.get("/{username}", response_model=PublicProfileOut)
def get_public_profile(username: str, db: Session = Depends(get_db)) -> PublicProfileOut:
    user = _public_user(username, db)
    summary = progress_service.get_progress_summary(db, user.id)
    return PublicProfileOut(
        user=PublicUserOut(
            username=user.username,
            display_name=user.display_name,
            country=user.country,
            linkedin_url=user.linkedin_url,
            github_url=user.github_url,
            website_url=user.website_url,
            has_avatar=user.has_avatar,
            created_at=user.created_at,
        ),
        progress=PublicProgressOut(
            total_solved=summary["total_solved"],
            easy_solved=summary["easy_solved"],
            medium_solved=summary["medium_solved"],
            hard_solved=summary["hard_solved"],
            problems_attempted=summary["problems_attempted"],
            total_problems=summary["total_problems"],
            easy_total=summary["easy_total"],
            medium_total=summary["medium_total"],
            hard_total=summary["hard_total"],
            total_submissions=summary["total_submissions"],
            current_streak=summary["current_streak"],
            longest_streak=summary["longest_streak"],
            activity_calendar=summary["activity_calendar"],
            topic_progress=summary["topic_progress"],
        ),
    )


@router.get("/{username}/avatar")
def get_public_avatar(username: str, db: Session = Depends(get_db)) -> Response:
    user = _public_user(username, db)
    if not user.avatar_bytes or not user.avatar_content_type:
        raise NotFoundError("No profile picture uploaded.")
    return Response(
        content=user.avatar_bytes,
        media_type=user.avatar_content_type,
        headers={"Cache-Control": "public, max-age=60"},
    )

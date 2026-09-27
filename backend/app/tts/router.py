from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.common.deps import get_current_user
from app.tts.service import synthesize
from app.users.models import User

router = APIRouter(prefix="/api/v1/tts", tags=["tts"])


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


@router.post("/speech")
def create_speech(payload: SpeechRequest, _: User = Depends(get_current_user)) -> Response:
    """Turn text into audio. Signed-in users only: synthesis costs GPU time."""
    audio, content_type = synthesize(payload.text)
    return Response(
        content=audio,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=86400"},
    )

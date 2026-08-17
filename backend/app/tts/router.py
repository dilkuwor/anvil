from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.tts.service import synthesize

router = APIRouter(prefix="/api/v1/tts", tags=["tts"])


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


@router.post("/speech")
def create_speech(payload: SpeechRequest) -> Response:
    audio, content_type = synthesize(payload.text)
    return Response(
        content=audio,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=60"},
    )

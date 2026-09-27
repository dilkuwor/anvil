from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from app.common.deps import get_current_user
from app.stt.service import MAX_BYTES, transcribe
from app.users.models import User

router = APIRouter(prefix="/api/v1/stt", tags=["stt"])


class TranscriptOut(BaseModel):
    text: str


@router.post("/transcribe", response_model=TranscriptOut)
async def transcribe_audio(file: UploadFile = File(...), _: User = Depends(get_current_user)) -> TranscriptOut:
    """Turn a short recording into text. Signed-in users only: transcription costs GPU time."""
    audio = await file.read(MAX_BYTES + 1)
    return TranscriptOut(
        text=transcribe(audio, filename=file.filename or "speech.webm", content_type=file.content_type or "audio/webm")
    )

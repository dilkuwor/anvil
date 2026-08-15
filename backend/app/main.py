from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.common import models as _models  # noqa: F401
from app.common.config import get_settings
from app.common.errors import register_exception_handlers
from app.common.logging import configure_logging
from app.interviews.router import router as interviews_router
from app.problems.router import router as problems_router
from app.progress.router import router as progress_router
from app.submissions.router import router as submissions_router

settings = get_settings()
configure_logging(settings)

app = FastAPI(title=settings.app_name, version="0.1.0")
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(problems_router)
app.include_router(submissions_router)
app.include_router(progress_router)
app.include_router(interviews_router)


@app.get("/health")
@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}

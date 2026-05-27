from fastapi import APIRouter

from app.api import detection, health, stream

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(detection.router, prefix="/detect", tags=["detection"])
api_router.include_router(stream.router, prefix="/stream", tags=["stream"])

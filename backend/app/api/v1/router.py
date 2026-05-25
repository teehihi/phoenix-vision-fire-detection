from fastapi import APIRouter

from app.api.v1.endpoints import alerts, detections

api_router = APIRouter()
api_router.include_router(detections.router, prefix="/detections", tags=["detections"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

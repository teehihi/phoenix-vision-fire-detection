from fastapi import APIRouter

from app.api.v1.endpoints import alerts, auth, detections, emergency, incident_timeline

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(detections.router, prefix="/detections", tags=["detections"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(emergency.router, prefix="/emergency", tags=["emergency"])
api_router.include_router(incident_timeline.router, prefix="/incident-timeline", tags=["incident-timeline"])

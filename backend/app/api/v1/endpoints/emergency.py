from fastapi import APIRouter, HTTPException

from app.repositories.emergency_repository import emergency_repository
from app.schemas.emergency import EmergencyEventCreate, EmergencyEventResponse, EmergencyStatusResponse
from app.services.emergency_service import EmergencyService

router = APIRouter()
service = EmergencyService(emergency_repository)


@router.get("/current", response_model=EmergencyStatusResponse)
async def get_current_status(camera_id: str = "webcam-01") -> EmergencyStatusResponse:
    return service.get_status(camera_id)


@router.get("/events", response_model=list[EmergencyEventResponse])
async def list_events() -> list[EmergencyEventResponse]:
    return service.list_events()


@router.post("/events", response_model=EmergencyStatusResponse)
async def ingest_event(payload: EmergencyEventCreate) -> EmergencyStatusResponse:
    return service.ingest_event(payload)


@router.post("/events/{event_id}/acknowledge", response_model=EmergencyEventResponse)
async def acknowledge_event(event_id: str) -> EmergencyEventResponse:
    event = service.acknowledge(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Emergency event not found.")
    return event


@router.post("/events/{event_id}/resolve", response_model=EmergencyEventResponse)
async def resolve_event(event_id: str) -> EmergencyEventResponse:
    event = service.resolve(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Emergency event not found.")
    return event

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user_id
from app.repositories.emergency_repository import emergency_repository
from app.schemas.emergency import EmergencyEventCreate, EmergencyEventResponse, EmergencyStatusResponse
from app.services.emergency_service import EmergencyService

router = APIRouter()
service = EmergencyService(emergency_repository)


@router.get("/current", response_model=EmergencyStatusResponse)
async def get_current_status(
    camera_id: str = "webcam-0",
    user_id: str = Depends(get_current_user_id),
) -> EmergencyStatusResponse:
    return service.get_status(user_id, camera_id)


@router.get("/events", response_model=list[EmergencyEventResponse])
async def list_events(user_id: str = Depends(get_current_user_id)) -> list[EmergencyEventResponse]:
    return service.list_events(user_id)


@router.post("/events", response_model=EmergencyStatusResponse)
async def ingest_event(
    payload: EmergencyEventCreate,
    user_id: str = Depends(get_current_user_id),
) -> EmergencyStatusResponse:
    try:
        return service.ingest_event(user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/events/{event_id}/acknowledge", response_model=EmergencyEventResponse)
async def acknowledge_event(
    event_id: str,
    user_id: str = Depends(get_current_user_id),
) -> EmergencyEventResponse:
    event = service.acknowledge(user_id, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Emergency event not found.")
    return event


@router.post("/events/{event_id}/resolve", response_model=EmergencyEventResponse)
async def resolve_event(
    event_id: str,
    user_id: str = Depends(get_current_user_id),
) -> EmergencyEventResponse:
    event = service.resolve(user_id, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Emergency event not found.")
    return event

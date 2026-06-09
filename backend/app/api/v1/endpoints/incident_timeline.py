from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user_id
from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel
from app.repositories.incident_timeline_repository import incident_timeline_repository
from app.schemas.incident_timeline import IncidentTimelineEventCreate, IncidentTimelineEventResponse
from app.services.incident_timeline_service import IncidentTimelineService

router = APIRouter()
service = IncidentTimelineService(incident_timeline_repository)


@router.get("", response_model=list[IncidentTimelineEventResponse])
async def list_incident_timeline(
    camera_id: str | None = Query(default=None),
    risk_level: IncidentRiskLevel | None = Query(default=None),
    event_type: IncidentEventType | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
) -> list[IncidentTimelineEventResponse]:
    return service.list_events(
        user_id=user_id,
        camera_id=camera_id,
        risk_level=risk_level,
        event_type=event_type,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", response_model=IncidentTimelineEventResponse)
async def create_incident_event(
    payload: IncidentTimelineEventCreate,
    user_id: str = Depends(get_current_user_id),
) -> IncidentTimelineEventResponse:
    return service.create_event(user_id, payload)


@router.delete("/{event_id}")
async def delete_incident_event(event_id: str, user_id: str = Depends(get_current_user_id)):
    from fastapi import HTTPException
    success = service.delete_event(user_id, event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự kiện này.")
    return {"status": "success", "message": "Xóa sự kiện thành công."}


@router.delete("")
async def clear_all_incident_events(user_id: str = Depends(get_current_user_id)):
    service.clear_all_events(user_id)
    return {"status": "success", "message": "Xóa tất cả sự kiện thành công."}

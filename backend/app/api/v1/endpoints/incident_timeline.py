from datetime import datetime

from fastapi import APIRouter, Query

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
) -> list[IncidentTimelineEventResponse]:
    return service.list_events(
        camera_id=camera_id,
        risk_level=risk_level,
        event_type=event_type,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", response_model=IncidentTimelineEventResponse)
async def create_incident_event(payload: IncidentTimelineEventCreate) -> IncidentTimelineEventResponse:
    return service.create_event(payload)

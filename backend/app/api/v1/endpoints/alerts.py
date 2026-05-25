from fastapi import APIRouter

from app.repositories.alert_repository import alert_repository
from app.schemas.alert import AlertResponse
from app.services.alert_service import AlertService

router = APIRouter()
service = AlertService(alert_repository)


@router.get("", response_model=list[AlertResponse])
async def list_alerts() -> list[AlertResponse]:
    return service.list_alerts()

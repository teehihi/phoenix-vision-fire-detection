from fastapi import APIRouter

from app.repositories.alert_repository import alert_repository
from app.schemas.alert import AlertResponse
from app.services.alert_service import AlertService

router = APIRouter()
service = AlertService(alert_repository)


@router.get("", response_model=list[AlertResponse])
async def list_alerts() -> list[AlertResponse]:
    return service.list_alerts()


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    from fastapi import HTTPException
    success = service.delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cảnh báo này.")
    return {"status": "success", "message": "Xóa cảnh báo thành công."}


@router.delete("")
async def clear_all_alerts():
    service.clear_all_alerts()
    return {"status": "success", "message": "Xóa tất cả cảnh báo thành công."}

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.dependencies import get_current_user_id
from app.repositories.detection_repository import detection_repository
from app.schemas.detection import DetectionEventResponse
from app.services.detection_service import DetectionService

router = APIRouter()
service = DetectionService(detection_repository)


@router.get("", response_model=list[DetectionEventResponse])
async def list_detections(user_id: str = Depends(get_current_user_id)) -> list[DetectionEventResponse]:
    return service.list_events(user_id)


@router.post("/frame", response_model=list[DetectionEventResponse])
async def detect_frame(
    file: UploadFile = File(...),
    camera_id: str = Form("webcam-0"),
    user_id: str = Depends(get_current_user_id),
) -> list[DetectionEventResponse]:
    image_bytes = await file.read()
    return await service.detect_frame(user_id=user_id, image_bytes=image_bytes, camera_id=camera_id)

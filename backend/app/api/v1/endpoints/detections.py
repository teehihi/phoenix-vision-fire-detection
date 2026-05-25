from fastapi import APIRouter, File, Form, UploadFile

from app.repositories.detection_repository import detection_repository
from app.schemas.detection import DetectionEventResponse
from app.services.detection_service import DetectionService

router = APIRouter()
service = DetectionService(detection_repository)


@router.get("", response_model=list[DetectionEventResponse])
async def list_detections() -> list[DetectionEventResponse]:
    return service.list_events()


@router.post("/frame", response_model=list[DetectionEventResponse])
async def detect_frame(
    file: UploadFile = File(...),
    camera_id: str = Form("webcam-01"),
) -> list[DetectionEventResponse]:
    image_bytes = await file.read()
    return await service.detect_frame(image_bytes=image_bytes, camera_id=camera_id)

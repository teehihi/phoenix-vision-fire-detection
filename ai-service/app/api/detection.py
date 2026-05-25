from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.detection import DetectionResponse
from app.services.detection_service import detection_service

router = APIRouter()


@router.post("/frame", response_model=DetectionResponse)
async def detect_frame(
    file: UploadFile = File(...),
    camera_id: str = Form("webcam-01"),
) -> DetectionResponse:
    image_bytes = await file.read()
    detections = detection_service.detect_image_bytes(image_bytes=image_bytes, camera_id=camera_id)
    return DetectionResponse(camera_id=camera_id, detections=detections)

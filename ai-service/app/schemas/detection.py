from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class DetectionResult(BaseModel):
    label: str
    confidence: float
    boxes: list[BoundingBox] = Field(default_factory=list)
    snapshot_url: str | None = None


class DetectionResponse(BaseModel):
    camera_id: str
    detections: list[DetectionResult]

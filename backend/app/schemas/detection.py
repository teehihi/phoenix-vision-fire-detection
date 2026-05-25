from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.detection import BoundingBox, DetectionSeverity


class DetectionEventResponse(BaseModel):
    id: str
    camera_id: str = Field(serialization_alias="cameraId")
    label: str
    confidence: float
    severity: DetectionSeverity
    boxes: list[BoundingBox]
    snapshot_url: str | None = Field(default=None, serialization_alias="snapshotUrl")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

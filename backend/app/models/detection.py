from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field


class DetectionSeverity(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class DetectionEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    camera_id: str
    label: str
    confidence: float
    severity: DetectionSeverity
    boxes: list[BoundingBox] = Field(default_factory=list)
    snapshot_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

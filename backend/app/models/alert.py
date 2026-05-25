from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field

from app.models.detection import DetectionSeverity


class AlertStatus(StrEnum):
    open = "open"
    acknowledged = "acknowledged"
    resolved = "resolved"


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    detection_id: str
    title: str
    message: str
    severity: DetectionSeverity
    status: AlertStatus = AlertStatus.open
    created_at: datetime = Field(default_factory=datetime.utcnow)

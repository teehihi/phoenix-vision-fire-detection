from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.alert import AlertStatus
from app.models.detection import DetectionSeverity


class AlertResponse(BaseModel):
    id: str
    detection_id: str = Field(serialization_alias="detectionId")
    title: str
    message: str
    severity: DetectionSeverity
    status: AlertStatus
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.detection import BoundingBox


class RiskLevel(StrEnum):
    SAFE = "SAFE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DangerZone(BaseModel):
    source_label: str
    confidence: float
    box: BoundingBox


class HumanRisk(BaseModel):
    person_box: BoundingBox
    nearest_zone: DangerZone
    distance_ratio: float
    inside_danger_zone: bool


class DangerAnalysisResult(BaseModel):
    risk_level: RiskLevel
    status: str
    fire_detected: bool = False
    smoke_detected: bool = False
    human_detected: bool = False
    human_at_risk: bool = False
    danger_zones: list[DangerZone] = Field(default_factory=list)
    humans_at_risk: list[HumanRisk] = Field(default_factory=list)

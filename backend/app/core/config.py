from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    project_name: str = "AI Fire Detection API"
    ai_service_url: str = "http://localhost:8100"
    alert_confidence_threshold: float = 0.65
    cors_origins: list[str] = []
    otp_secret: str = "phoenixvision-dev-otp-secret"
    otp_expire_minutes: int = 5
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "PhoenixVision"
    smtp_from_email: str = ""
    smtp_use_tls: bool = True
    firebase_project_id: str = ""
    firebase_storage_bucket: str = ""
    firebase_service_account_path: str = ""
    firebase_service_account_json: str = ""
    data_retention_days: int = 30
    esp32_base_url: str = ""
    esp32_auto_pump_delay_seconds: int = 10

    model_config = SettingsConfigDict(env_file=BACKEND_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

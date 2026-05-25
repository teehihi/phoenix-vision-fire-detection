from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "YOLO OpenCV Fire Detection Service"
    yolo_model_path: str = "models/fire.pt"
    detection_confidence: float = 0.45
    camera_index: int = 0
    camera_width: int = 1280
    camera_height: int = 720
    camera_fps: int = 30
    inference_size: int = 640
    yolo_device: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

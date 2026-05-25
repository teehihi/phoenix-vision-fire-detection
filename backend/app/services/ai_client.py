import httpx

from app.core.config import settings


class AIServiceClient:
    async def detect_frame(self, image_bytes: bytes, camera_id: str) -> list[dict]:
        files = {"file": ("frame.jpg", image_bytes, "image/jpeg")}
        data = {"camera_id": camera_id}

        async with httpx.AsyncClient(base_url=settings.ai_service_url, timeout=20) as client:
            response = await client.post("/api/detect/frame", files=files, data=data)
            response.raise_for_status()
            return response.json()["detections"]

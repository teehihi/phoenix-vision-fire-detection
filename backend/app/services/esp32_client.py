import logging
from typing import Any, Dict

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class Esp32Client:
    """
    Client for communicating with the ESP32 IoT device.
    Uses httpx for asynchronous HTTP requests.
    """

    def __init__(self):
        self.base_url = settings.esp32_base_url.rstrip("/")
        self.timeout = 5.0  # seconds

    async def _request(self, method: str, endpoint: str) -> Dict[str, Any]:
        if not self.base_url:
            logger.error("ESP32 base URL is not configured.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ESP32 base URL is not configured in environment.",
            )

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        logger.info(f"Sending {method} request to ESP32: {url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(method, url)
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to ESP32 at {url}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Timeout connecting to ESP32 device.",
            )
        except httpx.RequestError as e:
            logger.error(f"Error connecting to ESP32 at {url}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach ESP32 device.",
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"ESP32 returned error status {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ESP32 returned error status: {e.response.status_code}",
            )
        except Exception as e:
            logger.error(f"Unexpected error communicating with ESP32: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred while communicating with ESP32.",
            )

    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the ESP32."""
        return await self._request("GET", "/status")

    async def trigger_alarm(self, level: str = "medium") -> Dict[str, Any]:
        """Trigger the alarm on the ESP32 with a specific level (medium, high, critical)."""
        return await self._request("GET", f"/alarm?level={level}")

    async def stop_alarm(self) -> Dict[str, Any]:
        """Stop the alarm on the ESP32."""
        return await self._request("GET", "/stop")

    async def trigger_pump(self, on: bool) -> Dict[str, Any]:
        """Turn the pump ON or OFF on the ESP32."""
        endpoint = "/pump/on" if on else "/pump/off"
        return await self._request("GET", endpoint)

esp32_client = Esp32Client()

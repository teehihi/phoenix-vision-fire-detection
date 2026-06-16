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
        self.timeout = httpx.Timeout(1.2, connect=0.6)
        self._client: httpx.AsyncClient | None = None
        self.pump_on = False
        self.manual_override = False
        self.alarm_level: str | None = None

    async def _http_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

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
            last_error: Exception | None = None
            for attempt in range(2):
                try:
                    client = await self._http_client()
                    response = await client.request(method, url)
                    response.raise_for_status()
                    return response.json()
                except httpx.RequestError as exc:
                    last_error = exc
                    if attempt == 0:
                        await self._reset_client()
                        continue
                    raise
            raise last_error or RuntimeError("ESP32 request failed")
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
        normalized_level = level.lower()
        if self.alarm_level == normalized_level:
            return {"success": True, "alarm": True, "level": normalized_level, "message": "Already in requested alarm level"}
        response = await self._request("GET", f"/alarm?level={normalized_level}")
        self.alarm_level = normalized_level
        return response

    async def stop_alarm(self) -> Dict[str, Any]:
        """Stop the alarm on the ESP32."""
        response = await self._request("GET", "/stop")
        self.alarm_level = None
        self.pump_on = False
        self.manual_override = False
        return response

    async def trigger_pump(self, on: bool, manual: bool = False, force: bool = False) -> Dict[str, Any]:
        """Turn the pump ON or OFF on the ESP32."""
        if manual:
            self.manual_override = on

        # Ignore redundant commands
        if self.pump_on == on and not force:
            return {"status": "success", "message": "Already in requested state"}

        # Avoid auto-off if manually turned on
        if not on and not manual and not force and self.manual_override:
            logger.info("Ignoring auto-off pump command due to manual override")
            return {"status": "success", "message": "Ignored due to manual override"}

        endpoint = "/pump/on" if on else "/pump/off"
        response = await self._request("GET", endpoint)
        self.pump_on = on
        if not on:
            self.manual_override = False
        return response

    async def _reset_client(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
        self._client = None

esp32_client = Esp32Client()

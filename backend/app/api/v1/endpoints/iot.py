from typing import Any, Dict

from fastapi import APIRouter

from app.services.esp32_client import esp32_client

router = APIRouter()


@router.get("/status", response_model=Dict[str, Any])
async def get_iot_status() -> Dict[str, Any]:
    """
    Get the current status from the ESP32 IoT device.
    """
    return await esp32_client.get_status()


@router.post("/alarm", response_model=Dict[str, Any])
async def trigger_iot_alarm() -> Dict[str, Any]:
    """
    Send a command to trigger the alarm on the ESP32 IoT device.
    """
    return await esp32_client.trigger_alarm()


@router.post("/stop", response_model=Dict[str, Any])
async def stop_iot_alarm() -> Dict[str, Any]:
    """
    Send a command to stop the alarm on the ESP32 IoT device.
    """
    return await esp32_client.stop_alarm()

from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.esp32_client import esp32_client

router = APIRouter()


class IotRegisterPayload(BaseModel):
    ip: str


class AlarmTriggerPayload(BaseModel):
    level: Optional[str] = "medium"


@router.get("/status", response_model=Dict[str, Any])
async def get_iot_status() -> Dict[str, Any]:
    """
    Get the current status from the ESP32 IoT device.
    """
    return await esp32_client.get_status()


@router.post("/alarm", response_model=Dict[str, Any])
async def trigger_iot_alarm(payload: Optional[AlarmTriggerPayload] = None) -> Dict[str, Any]:
    """
    Send a command to trigger the alarm on the ESP32 IoT device.
    """
    level = "medium"
    if payload and payload.level:
        level = payload.level
    return await esp32_client.trigger_alarm(level)


@router.post("/stop", response_model=Dict[str, Any])
async def stop_iot_alarm() -> Dict[str, Any]:
    """
    Send a command to stop the alarm on the ESP32 IoT device.
    """
    return await esp32_client.stop_alarm()


@router.post("/register", response_model=Dict[str, Any])
async def register_iot_device(payload: IotRegisterPayload) -> Dict[str, Any]:
    """
    Register the ESP32 IoT device IP dynamically.
    """
    ip_address = payload.ip.strip()
    if not ip_address.startswith("http://") and not ip_address.startswith("https://"):
        esp32_client.base_url = f"http://{ip_address}"
    else:
        esp32_client.base_url = ip_address

    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Dynamically registered ESP32 at {esp32_client.base_url}")
    return {"success": True, "registered_url": esp32_client.base_url}


@router.post("/pump/on", response_model=Dict[str, Any])
async def turn_pump_on() -> Dict[str, Any]:
    """
    Turn on the water pump on the ESP32.
    """
    return await esp32_client.trigger_pump(True, manual=True)


@router.post("/pump/off", response_model=Dict[str, Any])
async def turn_pump_off() -> Dict[str, Any]:
    """
    Turn off the water pump on the ESP32.
    """
    return await esp32_client.trigger_pump(False, manual=True)



import logging

class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(
            route in message
            for route in [
                "/api/v1/emergency/current",
                "/api/v1/alerts",
                "/api/v1/iot/status",
                "/api/v1/incident-timeline",
            ]
        )

# Filter out frequent polling logs to prevent terminal spam
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

import socket
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings


def start_udp_discovery_responder(port: int = 50000):
    def responder():
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("", port))
        except Exception as e:
            logging.getLogger("uvicorn.error").error(f"[UDP Discovery] Bind failed: {e}")
            return
            
        logging.getLogger("uvicorn.error").info(f"[UDP Discovery] Listening for ESP32 discovery on port {port}")
        while True:
            try:
                data, addr = sock.recvfrom(1024)
                if data == b"PHOENIXVISION_DISCOVER":
                    sock.sendto(b"PHOENIXVISION_BACKEND", addr)
            except Exception as e:
                logging.getLogger("uvicorn.error").error(f"[UDP Discovery] Error: {e}")
                break

    t = threading.Thread(target=responder, daemon=True)
    t.start()


app = FastAPI(title=settings.project_name, version="0.1.0")


@app.on_event("startup")
async def startup_event():
    start_udp_discovery_responder(port=50000)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

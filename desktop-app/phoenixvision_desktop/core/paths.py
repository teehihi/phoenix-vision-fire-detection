from __future__ import annotations

import os
from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parents[3]
AI_SERVICE_DIR = ROOT_DIR / "ai-service"
CACHE_DIR = ROOT_DIR / ".cache"
FIRE_MODEL = AI_SERVICE_DIR / "models" / "fire.pt"
PERSON_MODEL = AI_SERVICE_DIR / "models" / "yolo11n.pt"
LOGO_LANDSCAPE = ROOT_DIR / "desktop-app" / "assets" / "PhoenixLogoLandscape.png"


def configure_runtime_paths() -> None:
    CACHE_DIR.mkdir(exist_ok=True)
    (CACHE_DIR / "matplotlib").mkdir(exist_ok=True)
    (CACHE_DIR / "ultralytics").mkdir(exist_ok=True)
    os.environ.setdefault("XDG_CACHE_HOME", str(CACHE_DIR))
    os.environ.setdefault("MPLCONFIGDIR", str(CACHE_DIR / "matplotlib"))
    os.environ.setdefault("YOLO_CONFIG_DIR", str(CACHE_DIR / "ultralytics"))

    if str(AI_SERVICE_DIR) not in sys.path:
        sys.path.insert(0, str(AI_SERVICE_DIR))

from __future__ import annotations

import argparse
import sys

from PySide6.QtWidgets import QApplication

from phoenixvision_desktop.core.paths import FIRE_MODEL, PERSON_MODEL, configure_runtime_paths


configure_runtime_paths()

from phoenixvision_desktop.views.main_window import PhoenixVisionWindow


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PhoenixVision desktop realtime monitoring app.")
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--fire-model", default=str(FIRE_MODEL))
    parser.add_argument("--person-model", default=str(PERSON_MODEL if PERSON_MODEL.exists() else "yolo11n.pt"))
    parser.add_argument("--confidence", type=float, default=0.45)
    parser.add_argument("--person-confidence", type=float, default=0.45)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    app = QApplication(sys.argv)
    app.setApplicationName("PhoenixVision")
    window = PhoenixVisionWindow(args)
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()

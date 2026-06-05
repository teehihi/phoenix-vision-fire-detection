from __future__ import annotations

import os
import subprocess
import sys
import venv
from importlib.util import find_spec
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent
AI_SERVICE_DIR = PROJECT_ROOT / "ai-service"
VENV_DIR = APP_DIR / ".venv"
REQUIREMENTS_FILE = APP_DIR / "requirements.txt"
BOOTSTRAP_ENV = "PHOENIXVISION_BOOTSTRAPPED"
REQUIRED_MODULES = ("PySide6", "cv2", "ultralytics")


def configure_import_paths() -> None:
    for path in (APP_DIR, AI_SERVICE_DIR):
        path_text = str(path)
        if path_text not in sys.path:
            sys.path.insert(0, path_text)


def venv_python_path() -> Path:
    if os.name == "nt":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def run_command(command: list[str]) -> None:
    subprocess.check_call(command, cwd=APP_DIR)


def module_exists(module_name: str) -> bool:
    return find_spec(module_name) is not None


def ensure_environment() -> None:
    missing_modules = [module_name for module_name in REQUIRED_MODULES if not module_exists(module_name)]
    if not missing_modules:
        return

    python_path = venv_python_path()
    if not python_path.exists():
        print("PhoenixVision: Dang tao moi truong Python rieng cho desktop app...")
        venv.EnvBuilder(with_pip=True).create(VENV_DIR)

    if not REQUIREMENTS_FILE.exists():
        raise FileNotFoundError(f"Khong tim thay file requirements: {REQUIREMENTS_FILE}")

    print("PhoenixVision: Dang cai thu vien can thiet, lan dau co the mat vai phut...")
    print("PhoenixVision: Thieu module:", ", ".join(missing_modules))
    run_command([str(python_path), "-m", "pip", "install", "--upgrade", "pip"])
    run_command([str(python_path), "-m", "pip", "install", "-r", str(REQUIREMENTS_FILE)])

    if os.environ.get(BOOTSTRAP_ENV) == "1":
        return

    env = os.environ.copy()
    env[BOOTSTRAP_ENV] = "1"
    os.execve(str(python_path), [str(python_path), str(Path(__file__).resolve())], env)


def run_app() -> None:
    from phoenixvision_desktop.main import main

    main()


if __name__ == "__main__":
    configure_import_paths()
    ensure_environment()
    run_app()

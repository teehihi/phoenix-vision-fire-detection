#!/usr/bin/env python3
"""Install dependencies and run PhoenixVision services for local demo."""

from __future__ import annotations

import argparse
import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
AI_DIR = ROOT / "ai-service"
FRONTEND_DIR = ROOT / "frontend"


def main() -> int:
    parser = argparse.ArgumentParser(description="Install and run PhoenixVision BE, AI and FE.")
    parser.add_argument("--skip-install", action="store_true", help="Skip pip/npm dependency installation.")
    parser.add_argument("--no-electron", action="store_true", help="Run only the Vite web frontend, not Electron.")
    parser.add_argument("--restart-existing", action="store_true", help="Stop existing services on ports 8000, 8100 and 5173 before starting.")
    args = parser.parse_args()

    processes: list[tuple[str, subprocess.Popen[bytes]]] = []

    try:
        if args.restart_existing:
            stop_existing_services([8000, 8100, 5173])

        if not args.skip_install:
            install_python_service("Backend", BACKEND_DIR)
            install_python_service("AI service", AI_DIR)
            install_frontend()

        start_service_if_needed(
            processes,
            "Backend API",
            8000,
            BACKEND_DIR,
            [python_bin(BACKEND_DIR), "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
        )
        start_service_if_needed(
            processes,
            "AI service",
            8100,
            AI_DIR,
            [python_bin(AI_DIR), "-m", "uvicorn", "app.main:app", "--reload", "--port", "8100"],
        )
        start_service_if_needed(processes, "Frontend Vite", 5173, FRONTEND_DIR, npm_cmd(["run", "dev"]))

        wait_for_port("Frontend Vite", 5173, timeout_seconds=30)

        if not args.no_electron:
            processes.append(start_process("Electron desktop", FRONTEND_DIR, npm_cmd(["run", "electron:dev"])))

        print("\nPhoenixVision is running.")
        print("Backend:  http://localhost:8000/health")
        print("AI:       http://localhost:8100/health")
        print("Frontend: http://localhost:5173")
        print("Press Ctrl+C to stop all services.\n")

        while all(process.poll() is None for _, process in processes):
            time.sleep(1)

        label, process = next(((label, process) for label, process in processes if process.poll() is not None), ("Unknown process", None))
        return_code = process.returncode if process else 1
        print(f"\n{label} stopped unexpectedly with exit code {return_code}.")
        return return_code or 1
    except KeyboardInterrupt:
        print("\nStopping PhoenixVision services...")
        return 0
    finally:
        stop_processes(processes)


def install_python_service(label: str, service_dir: Path) -> None:
    venv_dir = service_dir / ".venv"
    if not venv_dir.exists():
        run_checked(label, service_dir, [sys.executable, "-m", "venv", ".venv"])

    run_checked(label, service_dir, [python_bin(service_dir), "-m", "pip", "install", "--upgrade", "pip"])
    run_checked(label, service_dir, [python_bin(service_dir), "-m", "pip", "install", "-r", "requirements.txt"])


def install_frontend() -> None:
    run_checked("Frontend", FRONTEND_DIR, npm_cmd(["install"]))


def start_service_if_needed(
    processes: list[tuple[str, subprocess.Popen[bytes]]],
    label: str,
    port: int,
    cwd: Path,
    command: list[str],
) -> None:
    if is_port_open(port):
        print(f"\n{label} already appears to be running on port {port}; reusing it.")
        return

    processes.append(start_process(label, cwd, command))


def start_process(label: str, cwd: Path, command: list[str]) -> tuple[str, subprocess.Popen[bytes]]:
    print(f"\nStarting {label}: {' '.join(command)}")
    process = subprocess.Popen(command, cwd=cwd, start_new_session=os.name != "nt")
    return label, process


def run_checked(label: str, cwd: Path, command: list[str]) -> None:
    print(f"\n[{label}] {' '.join(command)}")
    subprocess.run(command, cwd=cwd, check=True)


def python_bin(service_dir: Path) -> str:
    if os.name == "nt":
        return str(service_dir / ".venv" / "Scripts" / "python.exe")
    return str(service_dir / ".venv" / "bin" / "python")


def npm_cmd(args: list[str]) -> list[str]:
    executable = "npm.cmd" if os.name == "nt" else "npm"
    return [executable, *args]


def wait_for_port(label: str, port: int, timeout_seconds: int) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if is_port_open(port):
            return
        time.sleep(0.25)
    raise RuntimeError(f"{label} did not open port {port} after {timeout_seconds} seconds.")


def is_port_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.5):
            return True
    except OSError:
        return False


def stop_existing_services(ports: list[int]) -> None:
    if os.name == "nt":
        print("\n--restart-existing is not automatic on Windows. Close old PhoenixVision terminals first.")
        return

    for port in ports:
        result = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True, check=False)
        pids = [int(pid) for pid in result.stdout.split() if pid.strip().isdigit()]
        if not pids:
            continue

        print(f"\nStopping existing service(s) on port {port}: {', '.join(map(str, pids))}")
        for pid in pids:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass

    time.sleep(1)

    for port in ports:
        result = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True, check=False)
        pids = [int(pid) for pid in result.stdout.split() if pid.strip().isdigit()]
        for pid in pids:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass


def stop_processes(processes: list[tuple[str, subprocess.Popen[bytes]]]) -> None:
    for _, process in processes:
        if process.poll() is None:
            if os.name == "nt":
                process.terminate()
            else:
                os.killpg(process.pid, signal.SIGINT)

    deadline = time.time() + 8
    for _, process in processes:
        remaining = max(deadline - time.time(), 0)
        try:
            process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            if os.name == "nt":
                process.kill()
            else:
                os.killpg(process.pid, signal.SIGKILL)


if __name__ == "__main__":
    raise SystemExit(main())

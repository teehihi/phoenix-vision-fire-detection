# Kiến Trúc Hệ Thống

## Luồng Chính

```text
Camera / RTSP / Webcam
  -> ai-service FastAPI/WebSocket
  -> YOLO fire/smoke detector
  -> temporal smoothing + risk scoring
  -> React frontend dashboard
  -> Electron wrapper cho Windows/macOS
```

Trọng tâm demo hiện tại là detect lửa/khói. Person detection bằng `yolo11n.pt` chỉ là phần mở rộng tuỳ chọn, không còn bắt buộc để chạy dự án.

## Frontend

`frontend/`
: FE chính dùng React + Vite + TypeScript.

`frontend/electron/`
: Electron main/preload process để bọc React app thành desktop app.

## AI Service

`ai-service/app/models`
: Adapter cho Ultralytics YOLO.

`ai-service/app/pipelines`
: Temporal smoothing, vẽ frame và phân tích risk.

`ai-service/app/streams`
: Mở webcam/video/stream bằng OpenCV.

`ai-service/app/api`
: FastAPI endpoint cho health check, detection và WebSocket stream.

`ai-service/models`
: Chứa model weights. `fire.pt` được commit để clone về chạy được ngay.

## Backend API

`backend/app/api`
: FastAPI router.

`backend/app/services`
: Workflow nghiệp vụ như detection event, alert, emergency và incident timeline.

`backend/app/repositories`
: Lớp lưu trữ dữ liệu hiện dùng in-memory storage, có thể thay bằng database thật.

## Docker Compose

`docker-compose.yml` hiện build:

- `backend` tại cổng `8000`.
- `ai-service` tại cổng `8100`.

Frontend/Electron chạy ngoài Docker để dễ truy cập UI desktop và camera host.

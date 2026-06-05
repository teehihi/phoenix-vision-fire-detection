# Kiến Trúc Hệ Thống

## Luồng Xử Lý Tổng Quan

```text
Webcam local
  -> desktop-app/run.py
  -> PySide6 UI đọc frame camera
  -> ai-service YOLO detector phân tích fire/smoke/person
  -> danger analysis tính risk level
  -> desktop app hiển thị frame, bounding boxes, timeline và trạng thái rủi ro
```

Backend và AI service API vẫn được giữ để mở rộng thành kiến trúc service:

```text
Camera/frame source
  -> ai-service FastAPI/WebSocket
  -> backend FastAPI lưu detection, alert, emergency, incident timeline
  -> client hiển thị hoặc hệ thống cảnh báo tiêu thụ sự kiện
```

## Giao Diện Desktop

`desktop-app/run.py`
: Entry point chính. Script cấu hình import path, tạo `.venv` riêng nếu thiếu dependency, cài requirements và chạy app.

`desktop-app/phoenixvision_desktop/main.py`
: Parse tham số camera/model/confidence và khởi tạo QApplication.

`desktop-app/phoenixvision_desktop/views`
: Chứa cửa sổ chính và workflow UI.

`desktop-app/phoenixvision_desktop/widgets`
: Chứa sidebar, camera card và inspector panel.

`desktop-app/phoenixvision_desktop/workers`
: Chứa worker đọc camera/detect frame trên thread riêng để UI không bị đứng.

`desktop-app/phoenixvision_desktop/core`
: Chứa path runtime, model UI, style và adapter detection realtime.

`desktop-app/assets`
: Chứa asset cần thiết cho desktop app, vì `frontend/` không còn nằm trong `main`.

## Dịch Vụ AI

`ai-service/app/models`
: Adapter cho Ultralytics YOLO.

`ai-service/app/pipelines`
: Xử lý frame, temporal smoothing và phân tích nguy hiểm.

`ai-service/app/streams`
: Mở webcam/video bằng OpenCV và đọc frame realtime.

`ai-service/app/services`
: Điều phối detection để API route và runner realtime có thể dùng lại.

`ai-service/app/api`
: FastAPI endpoint cho health check, detection và stream.

`ai-service/models`
: Chứa model weights. `fire.pt` được commit để clone về chạy được ngay; `yolo11n.pt` không commit vì Ultralytics tự tải khi cần.

## Backend API

`backend/app/api`
: FastAPI router, chỉ xử lý HTTP request/response.

`backend/app/services`
: Workflow nghiệp vụ như tạo detection event, emergency event và alert.

`backend/app/repositories`
: Lớp lưu trữ dữ liệu hiện dùng in-memory storage, có thể thay bằng database thật.

`backend/app/models`
: Model nghiệp vụ nội bộ.

`backend/app/schemas`
: Pydantic schema cho request/response.

`backend/app/core`
: Cấu hình hệ thống, CORS và dependency chung.

`backend/app/workers`
: Cho tác vụ nền như gửi thông báo hoặc giám sát camera về sau.

## Docker Compose

`docker-compose.yml` hiện build:

- `backend` tại cổng `8000`.
- `ai-service` tại cổng `8100`.

Desktop UI không chạy trong Docker vì cần truy cập camera host và hiển thị cửa sổ native.

## Chiến Lược Mở Rộng

- Desktop app là FE chính trong `main`.
- AI service tập trung vào xử lý ảnh, YOLO inference và stream.
- Backend giữ nghiệp vụ, lịch sử, cảnh báo và emergency workflow.
- Contract dùng chung nằm trong `shared/contracts`.
- Report, cache, dataset, training runs, `.venv` và frontend legacy không commit lên `main`.

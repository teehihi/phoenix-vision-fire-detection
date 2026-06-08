# PhoenixVision - Smart Fire Detection

PhoenixVision là hệ thống phát hiện cháy/khói theo thời gian thực bằng YOLO, OpenCV, FastAPI và giao diện React dashboard.

## Hướng phát triển hiện tại

- FE chính: `frontend/` dùng React + Vite.
- Desktop Windows/macOS: bọc `frontend/` bằng Electron.
- AI service: `ai-service/` xử lý YOLO/OpenCV và realtime stream.
- Backend: `backend/` cung cấp API sự kiện, cảnh báo, emergency và incident timeline.
- `desktop-app/` PySide đã bị loại khỏi hướng phát triển chính.

## Tính năng chính

- Phát hiện `fire`, `smoke` bằng model YOLO custom.
- Dashboard giám sát nhiều camera.
- Hỗ trợ webcam, RTSP/IP camera, Hikvision và các nguồn stream mở rộng.
- Lưu lịch sử phát hiện, cảnh báo và timeline sự cố qua backend.
- Có thể đóng gói thành app desktop Windows/macOS bằng Electron.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Desktop wrapper | Electron |
| AI service | FastAPI, OpenCV, Ultralytics YOLO |
| Backend | FastAPI, Pydantic |
| Contracts | JSON Schema |

## Cấu trúc thư mục

```text
phoenix-vision-fire-detection/
├── frontend/              # React dashboard và Electron wrapper
│   ├── electron/          # Main/preload process cho Electron
│   ├── public/            # Logo, icon
│   └── src/               # UI React
├── ai-service/            # YOLO + OpenCV + FastAPI realtime service
│   ├── app/
│   ├── models/
│   │   └── fire.pt        # Model fire/smoke đã commit
│   └── tests/
├── backend/               # API nghiệp vụ
├── docs/                  # Tài liệu dự án
├── shared/                # Contract/schema dùng chung
├── scripts/
└── docker-compose.yml
```

## Chạy Frontend Web

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`.

## Chạy Desktop App bằng Electron

Terminal 1:

```bash
cd frontend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run electron:dev
```

## Build

Build web:

```bash
cd frontend
npm run build
```

Build desktop installer:

```bash
cd frontend
npm run desktop:build
```

Output desktop nằm trong `frontend/release/`.

## Chạy AI Service

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.realtime_webcam --model models/fire.pt --camera 0
```

Mặc định pipeline chỉ tập trung detect lửa/khói. Nếu cần mở rộng phân tích người trong vùng nguy hiểm, có thể bật thêm bằng `--person-model yolo11n.pt`.

## Chạy Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API mặc định chạy tại `http://localhost:8000`.

## CI/CD

GitHub Actions hiện kiểm tra:

- Backend tests.
- AI service tests.
- React frontend build.

Nhánh `tee` vẫn được loại khỏi luồng auto PR/auto merge để giữ bản cũ.

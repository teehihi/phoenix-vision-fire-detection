# Hướng Dẫn Chạy Dự Án

## Yêu Cầu

- Node.js 22 cho frontend.
- Python 3.11+ cho backend và AI service.
- Webcam hoặc RTSP/IP camera nếu test realtime.
- `ai-service/models/fire.pt` đã có sẵn trong repo.

Person detection không bắt buộc. Không cần tải `yolo11n.pt` nếu chỉ demo fire/smoke.

## 1. Chạy Frontend Web

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`.

## 2. Chạy Desktop App Electron

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

## 3. Chạy AI Webcam Runner

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.realtime_webcam --model models/fire.pt --camera 0
```

Nếu muốn bật thêm person detection:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

## 4. Chạy Backend API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 5. Build

Frontend web:

```bash
cd frontend
npm run build
```

Desktop installer:

```bash
cd frontend
npm run desktop:build
```

Output nằm trong `frontend/release/`.

# PhoenixVision - Smart Fire Detection

PhoenixVision là hệ thống giám sát phát hiện cháy theo thời gian thực, kết hợp YOLO, OpenCV và giao diện desktop Python. App hiện tại tập trung vào luồng chạy local: mở camera, detect lửa/khói, detect người gần vùng nguy hiểm và hiển thị cảnh báo trực tiếp.

## Tính Năng Chính

- Phát hiện `fire` và `smoke` bằng model custom `ai-service/models/fire.pt`.
- Phát hiện `person` bằng `yolo11n.pt`; file này không commit, Ultralytics sẽ tự tải khi chạy lần đầu nếu máy có mạng.
- Giao diện desktop PySide6 trong `desktop-app/`.
- AI service FastAPI/OpenCV trong `ai-service/` để phục vụ inference và WebSocket stream khi cần.
- Backend FastAPI trong `backend/` để lưu detection, alert, emergency và incident timeline.
- Tài liệu kiến trúc, cài đặt và training trong `docs/`.

## Công Nghệ

| Thành phần | Công nghệ |
|---|---|
| Desktop app | Python, PySide6 |
| Computer vision | OpenCV, Ultralytics YOLO |
| AI runtime | Python, PyTorch, NumPy |
| Backend/API | FastAPI, Pydantic |
| Shared contract | JSON Schema |

## Cấu Trúc Thư Mục

```text
phoenix-vision-fire-detection/
├── desktop-app/           # Giao diện desktop chính, chạy bằng run.py
│   ├── assets/            # Tài nguyên giao diện desktop
│   └── phoenixvision_desktop/
├── ai-service/            # YOLO + OpenCV + FastAPI AI service
│   ├── app/
│   ├── configs/
│   ├── models/fire.pt     # Model custom đã commit để clone về có thể chạy ngay
│   └── tests/
├── backend/               # FastAPI backend cho detection, alert, emergency
├── docs/                  # Hướng dẫn setup, architecture, training
├── scripts/               # Ghi chú lệnh phát triển
├── shared/contracts/      # Schema dùng chung
├── docker-compose.yml
└── README.md
```

`frontend/` React cũ đã được bỏ khỏi `main` và được ignore. Nếu máy local vẫn còn thư mục này thì đó là bản legacy riêng, không phải FE chính của repo hiện tại.

## Chạy Nhanh Desktop App

Clone repo:

```bash
git clone https://github.com/teehihi/phoenix-vision-fire-detection.git
cd phoenix-vision-fire-detection
```

Chạy app desktop:

```bash
cd desktop-app
python run.py
```

`run.py` sẽ:

- Thêm đường dẫn import cần thiết cho `desktop-app` và `ai-service`.
- Tạo `.venv` riêng cho desktop app nếu thiếu dependency.
- Cài các dependency trong `desktop-app/requirements.txt`.
- Mở giao diện PhoenixVision.

Khi bấm `Start`, app dùng:

- `ai-service/models/fire.pt` để detect lửa/khói.
- `yolo11n.pt` để detect người. Nếu file chưa có, Ultralytics sẽ tự tải khi máy có internet.

## Chạy AI Webcam Runner Riêng

Nếu muốn test detection bằng OpenCV window:

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Windows PowerShell:

```powershell
cd ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Nếu camera `0` không mở được, thử `--camera 1`.

## Chạy Backend Và AI Service API

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

AI service:

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8100
```

Docker Compose hiện chỉ build backend và AI service:

```bash
docker compose up --build
```

## Model Policy

- `ai-service/models/fire.pt` được commit để thành viên clone repo có model fire/smoke sẵn.
- `yolo11n.pt` không commit để tránh lặp file nhẹ nhưng dư thừa; Ultralytics tự tải khi cần detect người.
- Dataset, training runs, cache, `.venv`, report và artifact local không commit.

## Tài Liệu

- [Hướng dẫn cài đặt và chạy dự án](docs/setup-guide.md)
- [Kiến trúc hệ thống](docs/architecture.md)
- [Hướng dẫn chuẩn bị dataset và train YOLO](docs/training-guide.md)

## Thành Viên

| Thành viên | GitHub |
|---|---|
| Nguyễn Nhật Thiên | [@teehihi](https://github.com/teehihi) |
| Phạm Văn Hậu | [@vanhau123w-collab](https://github.com/vanhau123w-collab) |
| Trương Công Anh | [@coqanklazy](https://github.com/coqanklazy) |

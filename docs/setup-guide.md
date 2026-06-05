# Hướng Dẫn Cài Đặt Và Chạy Dự Án

Tài liệu này mô tả cách chạy PhoenixVision theo cấu trúc hiện tại: `desktop-app` là giao diện chính, `ai-service` xử lý YOLO/OpenCV và `backend` phục vụ API nghiệp vụ.

## Yêu Cầu Môi Trường

- Python 3.12 khuyến nghị cho backend, AI service và desktop app.
- Webcam hoạt động.
- macOS, Windows hoặc Linux.
- Internet trong lần đầu detect người nếu máy chưa có `yolo11n.pt`.

Kiểm tra Python:

```bash
python3 --version
```

Windows PowerShell:

```powershell
py --version
```

## 0. Clone Repository

```bash
git clone https://github.com/teehihi/phoenix-vision-fire-detection.git
cd phoenix-vision-fire-detection
```

Repo đã commit sẵn `ai-service/models/fire.pt`, vì vậy clone về là có model fire/smoke custom. `yolo11n.pt` không nằm trong repo; Ultralytics sẽ tự tải khi app cần detect người.

## 1. Chạy Desktop App

Đây là cách chạy chính của dự án hiện tại.

macOS/Linux:

```bash
cd desktop-app
python run.py
```

Windows PowerShell:

```powershell
cd desktop-app
python run.py
```

`run.py` sẽ tự tạo `.venv` riêng trong `desktop-app/.venv` nếu thiếu PySide6, OpenCV hoặc Ultralytics, sau đó cài dependency từ `desktop-app/requirements.txt` và mở app.

Trong app:

1. Chọn camera index, mặc định là `0`.
2. Bấm `Start` để bắt đầu stream.
3. Nếu camera `0` không mở được, thử camera `1`.

Model được dùng:

- Fire/smoke: `ai-service/models/fire.pt`.
- Person: `yolo11n.pt`, tự tải khi chưa có local file và máy có internet.

## 2. Quyền Camera

macOS:

```text
System Settings -> Privacy & Security -> Camera
```

Bật quyền camera cho Terminal, iTerm hoặc VS Code.

Windows:

```text
Settings -> Privacy & security -> Camera
```

Bật quyền camera cho desktop apps hoặc terminal đang chạy.

## 3. Chạy AI Webcam Runner Riêng

Dùng khi muốn test OpenCV window trực tiếp, không cần mở desktop UI.

macOS/Linux:

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

Thoát OpenCV window bằng phím `q` hoặc `Esc`.

## 4. Chạy Backend API

macOS/Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Windows PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Kiểm tra:

```bash
curl http://localhost:8000/health
```

Kết quả mong đợi:

```json
{"status":"ok"}
```

## 5. Chạy AI Service API

Dùng khi cần gọi endpoint detection hoặc WebSocket stream.

macOS/Linux:

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8100
```

Windows PowerShell:

```powershell
cd ai-service
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8100
```

Kiểm tra:

```bash
curl http://localhost:8100/health
```

WebSocket webcam stream:

```text
ws://localhost:8100/api/stream/webcam?fps=12&quality=72
```

## 6. Docker Compose

Docker Compose hiện build backend và AI service. Desktop UI nên chạy trực tiếp trên máy host để truy cập camera tốt hơn.

```bash
docker compose up --build
```

Cổng mặc định:

```text
Backend API: http://localhost:8000
AI service:  http://localhost:8100
```

Lưu ý: Docker trên desktop không phải lúc nào cũng truy cập webcam local dễ dàng, nên để demo realtime nên dùng `desktop-app/run.py` hoặc `ai-service/app.realtime_webcam`.

## 7. Test Nhanh

Compile Python:

```bash
python3 -m compileall backend ai-service desktop-app
```

Kiểm tra desktop app parse đường dẫn model:

```bash
cd desktop-app
python run.py
```

## Lỗi Thường Gặp

`zsh: command not found: python`

Dùng `python3` thay cho `python`, hoặc cài Python 3.12.

`Unable to open webcam index 0`

Kiểm tra quyền camera hoặc đổi camera index sang `1`.

`Cannot find fire model`

Kiểm tra file:

```text
ai-service/models/fire.pt
```

File này đã được commit trong repo hiện tại. Nếu bị xoá local, checkout lại từ git.

`yolo11n.pt download failed`

Máy đang không có internet hoặc Ultralytics không tải được model person. Fire/smoke model vẫn có sẵn, nhưng detect person sẽ bị tắt nếu model person lỗi.

`Cannot install numpy... ultralytics...`

Dùng Python 3.12:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

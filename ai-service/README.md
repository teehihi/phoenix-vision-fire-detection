# AI Service - Realtime Fire Detection

AI service dùng Python, OpenCV và Ultralytics YOLO để detect frame từ webcam, API hoặc WebSocket stream.

## Vai Trò

- Load model `models/fire.pt` để detect `fire` và `smoke`.
- Person detection là tuỳ chọn, mặc định tắt để tập trung vào fire/smoke.
- Cung cấp realtime webcam runner bằng OpenCV.
- Cung cấp FastAPI endpoint và WebSocket stream cho các client khác.
- Chia sẻ pipeline detection cho React frontend qua API/WebSocket.

## Cài Đặt

macOS/Linux:

```bash
cd ai-service
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
cd ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Repo đã commit sẵn:

```text
models/fire.pt
```

Nếu train model mới, thay file này bằng weight mới.

## Chạy Webcam Runner

macOS/Linux:

```bash
python -m app.realtime_webcam --model models/fire.pt --camera 0
```

Windows PowerShell:

```powershell
python -m app.realtime_webcam --model models/fire.pt --camera 0
```

Nếu camera `0` không mở được, thử:

```bash
python -m app.realtime_webcam --model models/fire.pt --camera 1
```

Thoát OpenCV window bằng `q` hoặc `Esc`.

Tham số giảm false positive:

```bash
python -m app.realtime_webcam --model models/fire.pt --camera 0 --fire-conf 0.65 --smoke-conf 0.60 --stable-frames 4
```

Nếu cần bật phân tích người trong vùng nguy hiểm:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

## Chạy API

Chạy ổn định với webcam/Electron:

```bash
uvicorn app.main:app --port 8100
```

Chỉ dùng tự động reload khi đang sửa code:

```bash
uvicorn app.main:app --reload --port 8100
```

`--reload` sẽ restart worker khi file Python thay đổi, làm WebSocket ngắt và webcam phải mở lại.

Kiểm tra:

```bash
curl http://localhost:8100/health
```

Endpoint chính:

```text
POST /api/detect/frame
ws://localhost:8100/api/stream/webcam?fps=12&quality=72
```

## Train Model

Chuẩn bị dataset:

```bash
python -m app.training.prepare_dataset --download-indoor
```

Train YOLOv11 nano:

```bash
python -m app.training.train_yolo \
  --data ../datasets/fire_smoke/data.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 8
```

Sau khi train xong, script copy best weight về:

```text
models/fire.pt
```

Xem chi tiết tại [../docs/training-guide.md](../docs/training-guide.md).

## Cấu Hình

Có thể cấu hình bằng `.env`:

```env
YOLO_MODEL_PATH=models/fire.pt
DETECTION_CONFIDENCE=0.45
INFERENCE_SIZE=640
YOLO_DEVICE=cpu
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=30
```

## Camera

- macOS: AVFoundation, fallback generic.
- Windows: DirectShow, Media Foundation, fallback generic.
- Linux: V4L2, fallback generic.

Nếu gặp lỗi quyền camera, bật quyền cho Terminal, iTerm, VS Code hoặc PowerShell trong system settings của hệ điều hành.

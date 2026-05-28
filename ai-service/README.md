# Dịch Vụ AI - Phát Hiện Realtime Từ Webcam

Dịch vụ này dùng Python, OpenCV và YOLO để phát hiện object từ webcam theo thời gian thực.

Tính năng:

- Nhận dữ liệu đầu vào từ webcam
- Chạy YOLO inference realtime
- Vẽ bounding boxes
- Hiển thị nhãn và confidence
- Hiển thị bộ đếm FPS
- Tối ưu độ trễ bằng camera buffer thấp
- Hỗ trợ macOS, Windows và Linux

## Cài Đặt Trên macOS

Khuyến nghị dùng Python 3.12.

```bash
cd phoenix-vision-fire-detection/ai-service
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Nếu chưa có Python 3.12 trên macOS:

```bash
brew install python@3.12
```

Nếu không dùng venv và máy đã cài package bằng Python hiện tại, có thể chạy bằng `python3`.

## Cài Đặt Trên Windows

Mở PowerShell:

```powershell
cd phoenix-vision-fire-detection\ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Nếu chưa có Python 3.12, tải từ trang Python chính thức hoặc cài bằng winget:

```powershell
winget install Python.Python.3.12
```

## Chạy Phát Hiện Từ Webcam Trên macOS

Trước khi chạy, tải model fire/smoke đã train:

[Tải fire.pt từ Google Drive](https://drive.google.com/file/d/12ZUgw6NmtuVrUQHK-4-Qq5Xams-QI83_/view?usp=sharing)

Đặt file vào thư mục có sẵn:

```text
ai-service/models/fire.pt
```

Về model nhận diện người:

- `models/fire.pt` nhận diện `fire` và `smoke`.
- `yolo11n.pt` nhận diện `person`.
- File `yolo11n.pt` không cần lưu trong repository. Ultralytics sẽ tự tải model này khi chạy lần đầu nếu chưa có trên máy.
- Vì vậy lệnh chạy vẫn dùng `--person-model yolo11n.pt`.

Test nhanh với model fire đã train:

```bash
python3 -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Nếu đã active venv:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Chạy với model fire riêng:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Các tham số hữu ích để giảm false positive:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0 --fire-conf 0.65 --smoke-conf 0.60 --stable-frames 4
```

Khi `fire/smoke` xuất hiện và có `person` nằm gần vùng nguy hiểm, hệ thống sẽ đánh dấu `HUMAN AT RISK` và tính mức rủi ro realtime.

Nhấn `q` hoặc `Esc` để thoát.

## Chuẩn Bị Dataset Và Train Model

Tải dataset indoor từ Kaggle và gom về cấu trúc YOLO chuẩn:

```bash
python -m app.training.prepare_dataset --download-indoor
```

Train model YOLOv11 nhẹ cho webcam realtime:

```bash
python -m app.training.train_yolo \
  --data ../datasets/fire_smoke/data.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 8
```

Sau khi train xong, script sẽ copy model tốt nhất về:

```text
models/fire.pt
```

Xem hướng dẫn đầy đủ tại [../docs/training-guide.md](../docs/training-guide.md).

## Chạy Phát Hiện Từ Webcam Trên Windows

Nếu đã active venv:

```powershell
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Chạy với model fire riêng:

```powershell
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Nếu camera `0` không hoạt động:

```powershell
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 1
```

Nhấn `q` hoặc `Esc` để thoát.

## Cơ Chế Camera Theo Hệ Điều Hành

Code tự chọn cơ chế camera OpenCV phù hợp:

- macOS: AVFoundation, sau đó fallback generic
- Windows: DirectShow, sau đó Media Foundation, sau đó fallback generic
- Linux: V4L2, sau đó fallback generic

Nếu camera `0` không hoạt động:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 1
```

## Quyền Camera Trên macOS

Nếu gặp lỗi không được quyền mở camera:

```text
OpenCV: not authorized to capture video
```

Mở:

```text
System Settings -> Privacy & Security -> Camera
```

Bật quyền cho Terminal, iTerm hoặc VS Code. Sau đó đóng terminal và mở lại.

## Quyền Camera Trên Windows

Nếu Windows không cho mở webcam, vào:

```text
Settings -> Privacy & security -> Camera
```

Bật quyền camera cho desktop apps hoặc app terminal đang dùng.

## Chạy Dạng API

Ngoài realtime webcam runner, service cũng có FastAPI endpoint:

```bash
uvicorn app.main:app --reload --port 8001
```

Trên Windows cũng dùng lệnh tương tự sau khi active venv:

```powershell
uvicorn app.main:app --reload --port 8001
```

Kiểm tra:

```bash
curl http://localhost:8001/health
```

Detect frame qua API:

```text
POST /api/detect/frame
```

Stream frame đã xử lý cho React dashboard:

```text
ws://localhost:8001/api/stream/webcam?fps=12&quality=72
```

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

## Tối Ưu Độ Trễ Thấp

- `CAP_PROP_BUFFERSIZE = 1` để tránh đọc frame cũ.
- Ưu tiên backend camera native theo hệ điều hành.
- Dùng `imgsz` cố định để kiểm soát thời gian inference.
- Vẽ overlay trực tiếp trên frame hiện tại.
- Bộ đếm FPS dùng rolling window, không log nặng từng frame.

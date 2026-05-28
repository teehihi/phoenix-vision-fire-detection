# Hướng Dẫn Cài Đặt Và Chạy Dự Án

Tài liệu này hướng dẫn chạy hệ thống AI Fire Detection trên macOS và Windows.

## Yêu Cầu Môi Trường

Cài trước:

- Node.js 20 trở lên
- Python 3.12 khuyến nghị cho backend và AI service
- Webcam hoạt động
- macOS, Windows hoặc Linux

Kiểm tra phiên bản trên macOS:

```bash
node -v
npm -v
python3 --version
```

Kiểm tra phiên bản trên Windows PowerShell:

```powershell
node -v
npm -v
py --version
```

Lưu ý: AI service ổn định nhất với Python 3.12. Nếu macOS đang dùng Python 3.13, có thể gặp lỗi dependency với NumPy/Ultralytics.

## 0. Clone Repository

Trên macOS:

```bash
git clone https://github.com/teehihi/phoenix-vision-fire-detection.git
cd phoenix-vision-fire-detection
```

Trên Windows PowerShell:

```powershell
git clone https://github.com/teehihi/phoenix-vision-fire-detection.git
cd phoenix-vision-fire-detection
```

Các phần bên dưới giả định terminal đang đứng tại thư mục gốc `phoenix-vision-fire-detection`. Khi mở terminal mới, hãy `cd` lại vào thư mục gốc repository trước.

## 1. Chạy Dịch Vụ AI Realtime Webcam Trên macOS

Vào thư mục AI service:

```bash
cd ai-service
```

Tạo môi trường ảo bằng Python 3.12 nếu máy có sẵn:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Tải model fire/smoke đã train:

[Tải fire.pt từ Google Drive](https://drive.google.com/file/d/12ZUgw6NmtuVrUQHK-4-Qq5Xams-QI83_/view?usp=sharing)

Repository đã có sẵn thư mục `ai-service/models/`. Sau khi tải xong, đặt file vào:

```text
ai-service/models/fire.pt
```

Trong dự án có hai loại model:

- `models/fire.pt`: model custom đã train để nhận diện `fire` và `smoke`, cần tải từ Google Drive.
- `yolo11n.pt`: model YOLOv11 nano dùng để nhận diện `person`, không cần tải thủ công. Khi chạy lần đầu, Ultralytics sẽ tự tải nếu máy chưa có.

Nếu máy chưa có `python3.12`, trên macOS có thể cài:

```bash
brew install python@3.12
```

Nếu bạn muốn chạy nhanh bằng Python hiện tại:

```bash
python3 -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Nếu đã active venv:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Lệnh trên dùng model fire đã train tại `models/fire.pt`. Hãy tải file `fire.pt` từ Google Drive về `ai-service/models/fire.pt` trước khi chạy.

Nếu có model phát hiện lửa riêng, đặt file tại:

```text
ai-service/models/fire.pt
```

Rồi chạy:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Thoát cửa sổ webcam bằng phím `q` hoặc `Esc`.

### Quyền Camera Trên macOS

Nếu gặp lỗi:

```text
OpenCV: not authorized to capture video
Unable to open webcam index 0
```

Mở:

```text
System Settings -> Privacy & Security -> Camera
```

Bật quyền camera cho app đang chạy lệnh, ví dụ Terminal, iTerm hoặc VS Code. Sau đó tắt terminal và mở lại.

Nếu camera `0` không mở được, thử:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 1
```

## 2. Chạy Dịch Vụ AI Realtime Webcam Trên Windows

Mở PowerShell tại thư mục dự án, sau đó vào `ai-service`:

```powershell
cd ai-service
```

Nếu đang ở ngoài thư mục repository, hãy vào `phoenix-vision-fire-detection` trước rồi mới chạy lệnh trên.

Tạo môi trường ảo bằng Python 3.12:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Chạy test webcam với model fire đã train:

```powershell
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Nếu camera `0` không được:

```powershell
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 1
```

Nếu Windows hỏi quyền camera, vào:

```text
Settings -> Privacy & security -> Camera
```

Bật quyền camera cho desktop apps hoặc ứng dụng terminal bạn đang dùng.

Code tự chọn backend camera phù hợp:

- macOS: AVFoundation
- Windows: DirectShow, sau đó Media Foundation
- Linux: V4L2

## 3. Chạy Máy Chủ API Trên macOS

Mở terminal mới:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Kiểm tra backend:

```bash
curl http://localhost:8000/health
```

Kết quả mong đợi:

```json
{"status":"ok"}
```

## 4. Chạy Máy Chủ API Trên Windows

Mở PowerShell mới:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Kiểm tra backend:

```powershell
curl http://localhost:8000/health
```

Các API chính:

```text
GET  /api/v1/detections
POST /api/v1/detections/frame
GET  /api/v1/alerts
```

## 5. Chạy API Của Dịch Vụ AI

Realtime webcam runner ở bước 1 là cách test trực tiếp nhất. Nếu muốn chạy AI service dưới dạng API/WebSocket để dashboard React nhận frame đã xử lý:

Trên macOS:

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

Trên Windows:

```powershell
cd ai-service
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
```

Kiểm tra:

```bash
curl http://localhost:8001/health
```

Dashboard trang Live Detection sẽ kết nối WebSocket tới:

```text
ws://localhost:8001/api/stream/webcam?fps=12&quality=72
```

## 6. Chạy Dashboard Giao Diện Trên macOS

Mở terminal mới:

```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt:

```text
http://localhost:5173
```

## 7. Chạy Dashboard Giao Diện Trên Windows

Mở PowerShell mới:

```powershell
cd frontend
npm install
npm run dev
```

Mở trình duyệt:

```text
http://localhost:5173
```

Các trang chính:

- Dashboard: tổng quan camera, detection, alert
- Live Detection: giao diện webcam
- History: lịch sử phát hiện
- Alerts: cảnh báo

## 8. Chạy Bằng Docker Compose

Nếu muốn chạy cả hệ thống bằng Docker:

Trên macOS:

```bash
cd phoenix-vision-fire-detection
docker compose up --build
```

Trên Windows:

```powershell
cd phoenix-vision-fire-detection
docker compose up --build
```

Các cổng mặc định:

```text
Giao diện:    http://localhost:5173
Máy chủ API:  http://localhost:8000
Dịch vụ AI:   http://localhost:8001
```

Lưu ý: Docker thường không truy cập webcam local dễ như chạy Python trực tiếp. Để test realtime webcam, nên chạy `python -m app.realtime_webcam` trực tiếp trên máy.

## Test Nhanh

Kiểm tra cú pháp Python trên macOS:

```bash
cd phoenix-vision-fire-detection
python3 -m compileall backend ai-service
```

Kiểm tra cú pháp Python trên Windows:

```powershell
cd phoenix-vision-fire-detection
py -3.12 -m compileall backend ai-service
```

Test webcam với model fire đã train trên macOS:

```bash
cd ai-service
python3 -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Test webcam với model fire đã train trên Windows:

```powershell
cd ai-service
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

Test frontend build trên macOS hoặc Windows:

```bash
cd frontend
npm run build
```

## Lỗi Thường Gặp

`zsh: command not found: python`

Bạn chưa active venv hoặc máy chỉ có `python3`. Dùng:

```bash
python3 -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

`source: no such file or directory: .venv/bin/activate`

Bạn chưa tạo venv trên macOS. Tạo lại:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Trên Windows, lệnh active venv là:

```powershell
.\.venv\Scripts\activate
```

`Unable to open webcam index 0`

Kiểm tra quyền camera hoặc thử camera khác:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 1
```

Trên Windows:

```powershell
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 1
```

`Cannot install numpy... ultralytics...`

Dùng Python 3.12 trên macOS:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Dùng Python 3.12 trên Windows:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

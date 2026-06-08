# 🔥 PhoenixVision - Smart Fire Detection

<div align="center">

<img src="https://img.shields.io/badge/YOLO-Ultralytics-red?style=for-the-badge"/>
<img src="https://img.shields.io/badge/OpenCV-Computer%20Vision-blue?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Python-3.12-yellow?style=for-the-badge"/>
<img src="https://img.shields.io/badge/React-Vite-blue?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Electron-Desktop-orange?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Realtime-Detection-success?style=for-the-badge"/>
<img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge"/>

<br/>

> 🚨 Phát hiện cháy theo thời gian thực bằng AI nhằm hỗ trợ cảnh báo sớm, giảm thiểu thiệt hại và nâng cao an toàn.

</div>

---

# 📌 Giới thiệu dự án

**PhoenixVision** là hệ thống ứng dụng trí tuệ nhân tạo kết hợp mô hình **YOLO** và kỹ thuật **xử lý ảnh thời gian thực** nhằm phát hiện nguy cơ cháy từ camera giám sát.

Hệ thống được định hướng trở thành một nền tảng giám sát an toàn thông minh, có khả năng phân tích hình ảnh từ camera, nhận diện lửa/khói, ghi nhận lịch sử phát hiện và phát cảnh báo kịp thời cho người vận hành.

Các chức năng chính:

- 🔍 Nhận diện lửa và khói theo thời gian thực
- 🎥 Hỗ trợ webcam, camera giám sát, CCTV và RTSP/IP Camera
- ⚡ Hiển thị bounding boxes, confidence, FPS và trạng thái rủi ro trực tiếp
- 🧩 Cung cấp máy chủ API FastAPI cho lịch sử phát hiện, cảnh báo và timeline sự cố
- 🖥️ Cung cấp dashboard React + Tailwind, có thể bọc thành app desktop Windows/macOS bằng Electron
- 🔔 Hỗ trợ hệ thống cảnh báo khi phát hiện nguy cơ cháy
- 🧠 Ứng dụng Deep Learning trong giám sát an toàn
- 📊 Hỗ trợ mở rộng sang phân tích dữ liệu, thống kê và quản lý nhiều camera

---

# ✨ Tính năng nổi bật

## 🚨 Phát hiện cháy thời gian thực

- Sử dụng model YOLO custom `ai-service/models/fire.pt` để nhận diện `fire` và `smoke` trực tiếp từ camera.

## 🎯 Độ chính xác cao

- Áp dụng Computer Vision, confidence threshold và temporal smoothing để giảm cảnh báo giả.

## 📷 Hỗ trợ nhiều nguồn camera

- Webcam
- Camera giám sát
- CCTV
- RTSP/IP Camera
- Hikvision
- Video file

## 🔔 Hệ thống cảnh báo

- Tự động tạo cảnh báo khi phát hiện nguy cơ cháy
- Lưu lịch sử cảnh báo để phục vụ theo dõi và truy vết
- Có thể mở rộng:
  - Gửi Email
  - Telegram Bot
  - SMS
  - Còi báo động

## 📈 Khả năng mở rộng

- Smoke Detection
- Heatmap khu vực nguy hiểm
- Dashboard giám sát
- AI Analytics
- Desktop app Windows/macOS bằng Electron

---

# 🛠️ Công nghệ sử dụng

| Công nghệ | Vai trò |
|---|---|
| Ultralytics YOLO | Phát hiện đối tượng |
| OpenCV | Xử lý ảnh/video |
| Python | Dịch vụ AI và backend |
| NumPy | Xử lý dữ liệu |
| PyTorch | Deep Learning |
| FastAPI | Máy chủ API |
| React + Vite | Giao diện dashboard |
| Tailwind CSS | Thiết kế UI |
| Electron | Đóng gói desktop Windows/macOS |
| Pydantic | Schema request/response |
| JSON Schema | Contract dùng chung |

---

# 🧠 Kiến trúc hệ thống

```mermaid
graph TD
    A[Webcam / RTSP / IP Camera] --> B[AI Service FastAPI + OpenCV]
    B --> C[YOLO fire/smoke inference]
    C --> D[Temporal smoothing]
    D --> E{Phát hiện lửa/khói?}
    E -- Có --> F[Tạo detection/risk event]
    E -- Không --> G[Tiếp tục giám sát]
    F --> H[Backend API lưu lịch sử và cảnh báo]
    H --> I[React dashboard hiển thị trạng thái]
    I --> J[Electron desktop app Windows/macOS]
```

---

# 📂 Cấu trúc thư mục

```bash
phoenix-vision-fire-detection/
│
├── frontend/              # Giao diện React + Tailwind và Electron wrapper
│   ├── electron/          # Main/preload process cho Electron
│   ├── public/            # Logo và icon
│   └── src/               # Mã nguồn React dashboard
│
├── backend/               # Máy chủ API FastAPI
├── ai-service/            # YOLO + OpenCV + FastAPI AI service
│   ├── app/               # Mã nguồn dịch vụ AI
│   ├── configs/           # Cấu hình training YOLO
│   ├── models/            # Chứa model YOLO
│   │   └── fire.pt        # Model custom đã commit để clone về chạy được ngay
│   ├── tests/
│   └── requirements.txt
│
├── docs/                  # Tài liệu hướng dẫn và kiến trúc
├── shared/                # Contract/schema dùng chung
├── scripts/               # Ghi chú lệnh phát triển
├── docker-compose.yml
└── README.md
```

> `desktop-app/` PySide đã được loại khỏi hướng phát triển chính. FE hiện tại là `frontend/` React + Vite.

---

# ⚙️ Cài đặt dự án

## 1️⃣ Clone repository

```bash
git clone https://github.com/teehihi/phoenix-vision-fire-detection.git
cd phoenix-vision-fire-detection
```

Các bước bên dưới giả định terminal đang đứng tại thư mục gốc `phoenix-vision-fire-detection`. Nếu mở terminal mới, hãy `cd` lại vào thư mục gốc repository trước.

## 2️⃣ Model sử dụng trong dự án

Repository hiện đã commit sẵn model fire/smoke:

```text
ai-service/models/fire.pt
```

Lưu ý:

- `fire.pt` là model custom của dự án để nhận diện `fire` và `smoke`.
- Dự án hiện tập trung vào phát hiện lửa/khói.
- Person detection bằng `yolo11n.pt` là phần mở rộng tùy chọn, không bắt buộc khi demo.

## 3️⃣ Chạy dịch vụ AI realtime webcam

Trên macOS:

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.realtime_webcam --model models/fire.pt --camera 0
```

Trên Windows PowerShell:

```powershell
cd ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m app.realtime_webcam --model models/fire.pt --camera 0
```

Realtime runner đã có lọc confidence và temporal smoothing để giảm báo nhầm. Có thể siết chặt khi môi trường nhiều đèn vàng/ánh sáng mạnh:

```bash
python -m app.realtime_webcam --model models/fire.pt --camera 0 --fire-conf 0.65 --smoke-conf 0.60 --stable-frames 4
```

Nếu muốn bật thêm phân tích người trong vùng nguy hiểm:

```bash
python -m app.realtime_webcam --model models/fire.pt --person-model yolo11n.pt --camera 0
```

## 4️⃣ Chạy máy chủ API

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

AI service API/WebSocket:

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8100
```

AI service cung cấp stream frame đã xử lý qua:

```text
ws://localhost:8100/api/stream/webcam
```

## 5️⃣ Chạy giao diện dashboard

```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt tại:

```text
http://localhost:5173
```

## 6️⃣ Chạy desktop app bằng Electron

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

Build desktop installer:

```bash
cd frontend
npm run desktop:build
```

Output nằm trong:

```text
frontend/release/
```

## 7️⃣ Chạy bằng Docker Compose

Docker Compose hiện build backend và AI service:

```bash
docker compose up --build
```

Các cổng mặc định:

```text
Backend API: http://localhost:8000
AI service:  http://localhost:8100
```

Xem hướng dẫn đầy đủ cho macOS và Windows tại [docs/setup-guide.md](docs/setup-guide.md).

---

# 📚 Tài liệu hướng dẫn

- [Hướng dẫn cài đặt và chạy dự án](docs/setup-guide.md)
- [Hướng dẫn frontend desktop](docs/frontend-desktop.md)
- [Hướng dẫn chuẩn bị dataset và train YOLO](docs/training-guide.md)
- [Kiến trúc hệ thống](docs/architecture.md)

---

# 🧪 Dataset

Dự án hướng tới bài toán phát hiện lửa và khói. Dataset huấn luyện nên chứa:

- 🔥 Fire Images
- 💨 Smoke Images
- 🌆 Environment/Normal Images

Dataset cần được annotate theo chuẩn YOLO format trước khi train model. Model sau khi train nên được export thành file `.pt` và đặt tại:

```text
ai-service/models/fire.pt
```

Project đã cung cấp script hỗ trợ chuẩn bị dataset và train model:

```bash
cd ai-service
python -m app.training.prepare_dataset --download-indoor
python -m app.training.train_yolo --data ../datasets/fire_smoke/data.yaml
```

Xem chi tiết tại [docs/training-guide.md](docs/training-guide.md).

---

# 📊 Mục tiêu dự án

- Nâng cao khả năng cảnh báo cháy sớm
- Ứng dụng AI vào an toàn thực tế
- Hỗ trợ nghiên cứu Computer Vision
- Xây dựng hệ thống giám sát thông minh

---

# 👨‍💻 Thành viên thực hiện

| Thành viên | GitHub |
|---|---|
| Nguyễn Nhật Thiên | [@teehihi](https://github.com/teehihi) |
| Phạm Văn Hậu | [@vanhau123w-collab](https://github.com/vanhau123w-collab) |
| Trương Công Anh | [@coqanklazy](https://github.com/coqanklazy) |

---

# ⭐ Nếu thấy dự án hữu ích

Hãy để lại một ⭐ cho repository nhé!

<div align="center">

### 🔥 PhoenixVision
#### Smart Fire Detection using YOLO & Real-time Computer Vision

</div>

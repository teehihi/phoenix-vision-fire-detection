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

Backend lưu dữ liệu theo từng tài khoản tại:

```text
users/{firebaseUid}/alerts
users/{firebaseUid}/detections
users/{firebaseUid}/incidentTimeline
users/{firebaseUid}/emergencyEvents
users/{firebaseUid}/emergencyStatuses
```

Tạo Firebase Admin key tại **Firebase Console > Project settings > Service accounts > Generate new private key**.
Đặt file ngoài Git, rồi cấu hình `backend/.env`:

```env
FIREBASE_PROJECT_ID=phoenixvision-2105
FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/firebase-service-account.json
```

Triển khai Firestore Rules ở thư mục gốc:

```bash
npx firebase-tools deploy --only firestore:rules,storage
```

Backend xác minh Firebase ID token và luôn lấy UID từ token, không tin UID do client gửi lên.

### Tự động xóa dữ liệu cũ

`DATA_RETENTION_DAYS=30` thêm trường `expireAt` cho các collection group:

```text
alerts
detections
incidentTimeline
emergencyEvents
```

Trong Google Cloud Console, mở **Firestore > Time-to-live**, tạo TTL policy cho từng
collection group trên với field `expireAt`.

Áp dụng vòng đời 30 ngày cho ảnh snapshot:

```bash
gcloud storage buckets update gs://phoenixvision-2105.firebasestorage.app \
  --lifecycle-file=storage-lifecycle.json
```

Nếu đổi `DATA_RETENTION_DAYS`, cập nhật cả giá trị `age` trong `storage-lifecycle.json`.

### ESP32 IoT

Backend không để frontend gọi trực tiếp ESP32. Thay vào đó backend chạy health check nền mỗi 5 giây, cache trạng thái và chỉ chuyển `offline` sau nhiều lần lỗi liên tiếp.

Có hai cách cấu hình địa chỉ ESP32:

```env
# Cách 1: mDNS
ESP32_BASE_URL=http://phoenixvision.local

# Cách 2: ESP32 tự đăng ký IP khi boot/reconnect
# ESP32_BASE_URL=
```

Nếu dùng cách 2, trong `phoenixvision-esp32/src/main/secrets.h` đặt:

```cpp
const char* BACKEND_REGISTER_URL = "http://IP_BACKEND:8000/api/v1/iot/register";
```

Các tham số timeout/backoff mặc định:

```env
ESP32_REQUEST_TIMEOUT_SECONDS=2.5
ESP32_HEALTH_INTERVAL_SECONDS=5
ESP32_OFFLINE_FAILURE_THRESHOLD=3
ESP32_CIRCUIT_FAILURE_THRESHOLD=4
ESP32_CIRCUIT_COOLDOWN_SECONDS=15
```

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

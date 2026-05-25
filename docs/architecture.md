# Kiến Trúc Hệ Thống

## Luồng Xử Lý Tổng Quan

```text
Webcam trên trình duyệt hoặc webcam local
  -> Giao diện phát hiện realtime
  -> Dịch vụ AI xử lý /detect/frame hoặc runner webcam realtime
  -> Máy chủ API lưu sự kiện phát hiện
  -> Dịch vụ cảnh báo đánh giá mức độ nghiêm trọng
  -> Dashboard, lịch sử và cảnh báo hiển thị trạng thái mới nhất
```

## Giao Diện Người Dùng

`frontend/src/app`
: Khởi tạo khung ứng dụng và cấu hình provider cấp ứng dụng.

`frontend/src/routes`
: Khai báo route cho dashboard, phát hiện realtime, cảnh báo và lịch sử.

`frontend/src/components`
: Chứa component dùng chung và component theo tính năng. Các component layout được tách riêng khỏi widget nghiệp vụ.

`frontend/src/features`
: Chứa module theo từng tính năng. Mỗi module quản lý bố cục trang, state cục bộ và lời gọi API cho nghiệp vụ tương ứng.

`frontend/src/hooks`
: Chứa hook tái sử dụng cho các tích hợp trình duyệt như truy cập webcam hoặc polling.

`frontend/src/lib`
: Chứa API client, hằng số và helper định dạng dữ liệu.

`frontend/src/types`
: Chứa TypeScript DTO tương ứng với schema trong `shared/contracts`.

## Máy Chủ API

`backend/app/api`
: Chứa FastAPI router. Tầng này chỉ nên xử lý HTTP request/response.

`backend/app/services`
: Chứa workflow nghiệp vụ như tạo lịch sử phát hiện, kích hoạt cảnh báo và gọi AI service.

`backend/app/repositories`
: Chứa lớp trừu tượng lưu trữ dữ liệu. Hiện tại dùng in-memory storage, có thể thay bằng PostgreSQL hoặc database khác sau này.

`backend/app/models`
: Chứa model nghiệp vụ nội bộ của máy chủ API.

`backend/app/schemas`
: Chứa Pydantic schema cho request và response.

`backend/app/core`
: Chứa cấu hình hệ thống, CORS, logging và dependency chung.

`backend/app/workers`
: Dành cho tác vụ nền như gửi thông báo, dọn sự kiện cũ hoặc giám sát camera.

## Dịch Vụ AI

`ai-service/app/models`
: Chứa adapter cho YOLO model và cấu trúc dữ liệu phục vụ inference.

`ai-service/app/pipelines`
: Chứa pipeline xử lý frame, vẽ bounding boxes, annotation và hậu xử lý kết quả.

`ai-service/app/streams`
: Chứa logic mở webcam/video bằng OpenCV và đọc frame realtime.

`ai-service/app/services`
: Điều phối detection để API route và runner realtime có thể dùng lại.

`ai-service/app/api`
: Chứa FastAPI endpoint cho health check và detect frame.

`ai-service/models`
: Chứa model weights local, ví dụ `fire.pt`. Thư mục này không commit model thật lên git.

## Chiến Lược Webcam Realtime

Dự án có hai hướng realtime:

- Chạy trực tiếp bằng OpenCV local qua `python -m app.realtime_webcam`.
- Gửi frame từ giao diện hoặc máy chủ API tới dịch vụ AI qua HTTP API.

Với môi trường production cần độ trễ thấp hơn, có thể bổ sung WebSocket stream giữa giao diện và dịch vụ AI, sau đó chỉ gửi detection event đã xác nhận về máy chủ API.

## Module Lịch Sử Phát Hiện

Lịch sử phát hiện chuẩn hoá output từ dịch vụ AI thành các event gồm camera ID, nhãn, confidence, bounding boxes, severity, thời gian tạo và snapshot URL nếu có.

## Module Cảnh Báo

Module cảnh báo chuyển detection thành sự cố có thể xử lý. Khi confidence vượt ngưỡng cấu hình, máy chủ API có thể tạo cảnh báo, gán severity và sau này mở rộng sang email, SMS, push notification hoặc kênh vận hành nội bộ.

## Nguyên Tắc Mở Rộng

- Giao diện chỉ quản lý trải nghiệm người dùng và gọi API.
- Máy chủ API giữ nghiệp vụ, lịch sử, cảnh báo và tích hợp service.
- Dịch vụ AI chỉ tập trung vào xử lý ảnh, webcam, YOLO inference và tối ưu độ trễ.
- Contract dùng chung nên được đặt trong `shared/contracts` để tránh lệch dữ liệu giữa các service.

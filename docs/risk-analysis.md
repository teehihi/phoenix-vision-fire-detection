# Phân Tích Rủi Ro Cháy Theo Thời Gian Thực

Tài liệu này mô tả thiết kế hệ thống chấm điểm rủi ro cháy cho PhoenixVision AI.

## Kiến Trúc Hệ Thống

```text
Camera/Webcam
-> OpenCV frame capture
-> YOLOv11 fire/smoke model
-> YOLOv11 person model
-> Confidence filter
-> Temporal smoothing
-> Danger zone builder
-> Fire risk scoring engine
-> Realtime overlay / API response / alert module
```

Các module chính:

```text
ai-service/app/models/yolo_detector.py
: Chạy YOLO inference và trả về detection boxes.

ai-service/app/pipelines/temporal_smoothing.py
: Lọc false positive bằng nhiều frame liên tiếp.

ai-service/app/pipelines/danger_analysis.py
: Tạo vùng nguy hiểm, kiểm tra người gần lửa/khói, tính risk score.

ai-service/app/pipelines/frame_pipeline.py
: Vẽ bounding boxes, danger zone, FPS, risk banner.
```

## Công Thức Risk Score

Risk score nằm trong khoảng `0-100`.

```text
risk_score =
  fire_area_score      * 0.25
+ smoke_density_score  * 0.20
+ duration_score       * 0.20
+ human_nearby_score   * 0.20
+ proximity_score      * 0.10
+ consistency_score    * 0.05
```

Ý nghĩa các thành phần:

```text
fire_area_score
: Diện tích vùng lửa / diện tích frame. Lửa càng lớn, điểm càng cao.

smoke_density_score
: Tổng diện tích vùng khói / diện tích frame. Khói dày hoặc lan rộng làm tăng điểm.

duration_score
: Thời gian fire/smoke tồn tại liên tục. Cháy kéo dài càng lâu càng nguy hiểm.

human_nearby_score
: Số người nằm trong hoặc gần danger zone.

proximity_score
: Người càng gần vùng fire/smoke thì điểm càng cao.

consistency_score
: Tỷ lệ frame gần đây có fire/smoke. Giúp giảm báo nhầm do một frame nhiễu.
```

## Mức Rủi Ro

```text
0-30   LOW
31-60  MEDIUM
61-80  HIGH
81-100 CRITICAL
```

Quy tắc ưu tiên:

```text
fire + smoke + human nearby => CRITICAL
fire/smoke + human nearby   => HIGH
fire/smoke only             => MEDIUM hoặc LOW tùy risk score
```

## Chống Báo Nhầm

Hệ thống giảm false alarm bằng:

```text
Confidence filtering
: Bỏ detection dưới ngưỡng `--fire-conf`, `--smoke-conf`, `--person-conf`.

Temporal smoothing
: Fire/smoke phải xuất hiện đủ số frame trong cửa sổ gần nhất.

Minimum area filtering
: Bỏ box quá nhỏ bằng `--min-area-ratio`.

Frame consistency
: Risk score tăng khi tín hiệu ổn định qua nhiều frame.

Duration persistence
: Tín hiệu vừa xuất hiện không lập tức bị đẩy lên critical nếu chưa kéo dài.
```

## Backend Architecture Đề Xuất

```text
backend/app/api/v1/endpoints/risk.py
: REST endpoint lấy risk summary mới nhất.

backend/app/services/risk_service.py
: Nhận event từ AI service, lưu risk timeline, phát alert.

backend/app/repositories/risk_repository.py
: Lưu history theo camera_id.

shared/contracts/risk.py hoặc shared/contracts/risk.ts
: DTO dùng chung cho dashboard.
```

API nên có:

```text
GET /api/v1/risk/current
GET /api/v1/risk/history
POST /api/v1/risk/events
```

## Tối Ưu Realtime

```text
- Dùng YOLOv11n cho webcam realtime.
- Fire/smoke model chạy mỗi frame.
- Person model có thể chạy mỗi N frame qua `--person-every`.
- Reuse person detection giữa các frame.
- Giữ frame size 640 hoặc 720p capture để cân bằng tốc độ/độ chính xác.
- Chỉ gửi risk summary sang backend, không gửi toàn bộ frame nếu chưa cần.
- Dùng queue hoặc WebSocket cho dashboard realtime.
```

## UI Visualization

Dashboard nên hiển thị:

```text
Risk badge
: LOW xanh dương, MEDIUM cam, HIGH đỏ, CRITICAL tím/đỏ đậm.

Risk score gauge
: Đồng hồ 0-100.

Realtime camera overlay
: Bounding box fire/smoke/person, danger zone, HUMAN AT RISK.

Timeline
: Biểu đồ risk score theo thời gian.

Alert panel
: Danh sách cảnh báo có camera_id, thời gian, risk level, số người nguy hiểm.
```

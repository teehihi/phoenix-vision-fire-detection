# Emergency Response System

Tài liệu này mô tả hệ thống phản ứng khẩn cấp cho PhoenixVision AI sau khi đã có detection và risk scoring.

## Kiến Trúc Tổng Thể

```text
Camera/Webcam
-> YOLOv11 fire/smoke/person
-> Fire risk scoring engine
-> Emergency state machine
-> Cooldown + escalation guard
-> Snapshot capture
-> FastAPI emergency endpoints
-> React dashboard warning UI
-> Sound/visual alarm
```

## Backend Logic

Endpoint chính:

```text
GET  /api/v1/emergency/current
GET  /api/v1/emergency/events
POST /api/v1/emergency/events
POST /api/v1/emergency/events/{event_id}/acknowledge
POST /api/v1/emergency/events/{event_id}/resolve
```

Payload từ AI service gửi về backend:

```json
{
  "cameraId": "webcam-01",
  "riskLevel": "HIGH",
  "riskScore": 72,
  "humanAtRisk": true,
  "snapshotUrl": "/snapshots/webcam-01/2026-05-27T10-10-00.jpg"
}
```

Backend chuyển risk thành emergency state:

```text
LOW      -> monitoring
MEDIUM   -> warning
HIGH     -> emergency
CRITICAL -> critical
humanAtRisk=true -> emergency trở lên
```

## Event State Machine

```text
monitoring
  -> warning    khi fire/smoke risk bắt đầu ổn định
  -> emergency  khi risk score cao hoặc humanAtRisk
  -> critical   khi fire + smoke + humanAtRisk hoặc score rất cao

warning
  -> monitoring khi resolve
  -> emergency  khi risk tăng
  -> critical   khi nguy cơ cực cao

emergency
  -> monitoring khi resolve
  -> critical   khi score tăng hoặc nhiều người nguy hiểm

critical
  -> monitoring chỉ khi operator resolve
```

## Cooldown Chống Báo Nhầm

Hệ thống không tạo event mới liên tục nếu state không đổi.

```text
warning   cooldown 20s
emergency cooldown 12s
critical  cooldown 6s
```

Cooldown giúp tránh spam alert khi cùng một đám cháy được detect qua nhiều frame liên tiếp.

## Alarm Escalation

`escalationCount` tăng khi state đi lên:

```text
monitoring -> warning   +1
warning    -> emergency +1
emergency  -> critical  +1
```

Không tăng khi cùng state được refresh trong cooldown.

## Snapshot Capture

AI service nên capture snapshot khi:

```text
- state chuyển từ monitoring sang warning/emergency/critical
- humanAtRisk=true
- riskScore vượt ngưỡng mới
```

Đường dẫn snapshot được gửi vào `snapshotUrl` để backend lưu trong emergency event và frontend hiển thị.

## Frontend Flow

React dashboard polling:

```text
EmergencyPanel
-> GET /api/v1/emergency/current mỗi 3 giây
-> render state badge
-> bật flashing effect nếu warning/emergency/critical
-> phát âm thanh nếu người dùng bật alarm
-> hiển thị snapshot nếu có
```

## Visual Effects

```text
monitoring
: xanh, không nhấp nháy, không âm thanh.

warning
: vàng/cam, pulse nhẹ, beep chậm.

emergency
: đỏ, pulse mạnh, beep nhanh.

critical
: nền tím/đỏ đậm, flashing nhanh, âm báo dày hơn.
```

## Folder Structure Đề Xuất

```text
backend/app/models/emergency.py
: EmergencyState, EmergencyEvent, EmergencyStatus.

backend/app/schemas/emergency.py
: Request/response DTO.

backend/app/repositories/emergency_repository.py
: Lưu event/status hiện tại. Có thể thay bằng database sau.

backend/app/services/emergency_service.py
: State machine, cooldown, escalation.

backend/app/api/v1/endpoints/emergency.py
: REST API cho dashboard.

frontend/src/features/emergency/EmergencyPanel.tsx
: UI trạng thái khẩn cấp.

frontend/src/hooks/useEmergencyTone.ts
: Âm cảnh báo động theo state.
```

## Realtime Optimization

```text
- AI service chỉ gửi emergency summary thay vì frame liên tục.
- Snapshot chỉ capture khi state transition hoặc cooldown kết thúc.
- Frontend poll status nhẹ mỗi 2-3 giây, dùng WebSocket ở phiên bản nâng cao.
- Alarm sound chạy client-side bằng Web Audio API, không cần file âm thanh.
- Backend state machine tách khỏi detection history để dễ mở rộng nhiều camera.
```

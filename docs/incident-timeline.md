# Professional Incident Timeline System

Tài liệu này thiết kế hệ thống timeline sự cố cho PhoenixVision AI.

## Full Architecture

```text
AI detection / risk analysis / emergency transition
-> Snapshot capture
-> Incident timeline event
-> FastAPI timeline API
-> Efficient event storage
-> React realtime timeline
-> Operator filtering / review / replay
```

Luồng dữ liệu:

```text
YOLOv11 detects fire/smoke/person
-> risk engine tạo risk score + metadata
-> emergency service chuyển state nếu cần
-> incident timeline lưu event theo thời gian
-> dashboard poll hoặc WebSocket cập nhật timeline
```

## Database Schema

Production nên dùng PostgreSQL.

```sql
CREATE TABLE incident_events (
  id UUID PRIMARY KEY,
  camera_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  confidence DOUBLE PRECISION,
  risk_score DOUBLE PRECISION,
  fire_area_ratio DOUBLE PRECISION,
  smoke_area_ratio DOUBLE PRECISION,
  human_at_risk BOOLEAN DEFAULT FALSE,
  humans_nearby_count INTEGER DEFAULT 0,
  snapshot_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_camera_time ON incident_events(camera_id, created_at DESC);
CREATE INDEX idx_incident_risk_time ON incident_events(risk_level, created_at DESC);
CREATE INDEX idx_incident_type_time ON incident_events(event_type, created_at DESC);
```

Snapshot table nếu muốn quản lý file riêng:

```sql
CREATE TABLE snapshots (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES incident_events(id),
  camera_id TEXT NOT NULL,
  path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Backend API Structure

```text
GET  /api/v1/incident-timeline
POST /api/v1/incident-timeline
```

Filter query:

```text
camera_id
risk_level
event_type
date_from
date_to
```

Event metadata:

```json
{
  "timestamp": "createdAt",
  "confidence": 0.88,
  "riskLevel": "HIGH",
  "riskScore": 72,
  "fireAreaRatio": 0.12,
  "smokeAreaRatio": 0.24,
  "humanAtRisk": true,
  "humansNearbyCount": 2,
  "snapshotUrl": "/snapshots/webcam-01/event-id.jpg"
}
```

## Snapshot Storage System

AI service nên tự động capture snapshot khi:

```text
- risk level tăng
- emergency state transition
- humanAtRisk=true
- cooldown đã hết
- operator bấm manual capture
```

Đường dẫn khuyến nghị:

```text
storage/snapshots/{camera_id}/{yyyy-mm-dd}/{event_id}.jpg
```

Git không commit snapshot. Production nên dùng S3, Cloudflare R2, MinIO hoặc NAS nội bộ.

## React UI Structure

```text
frontend/src/features/history/HistoryPage.tsx
: Trang history tổng.

frontend/src/features/history/IncidentTimeline.tsx
: Timeline realtime, filter và snapshot preview.

frontend/src/lib/apiClient.ts
: getIncidentTimeline(filters).

frontend/src/types/detection.ts
: IncidentTimelineEvent DTO.
```

## Realtime Timeline Updates

Hiện tại dùng polling 4 giây:

```text
setInterval -> GET /incident-timeline -> render latest events
```

Production nên nâng cấp:

```text
WebSocket / Server-Sent Events
-> push event mới ngay khi backend tạo
-> giảm request lặp
-> hỗ trợ nhiều camera realtime
```

## Filtering

Timeline cần filter theo:

```text
risk level: LOW / MEDIUM / HIGH / CRITICAL
date: date_from / date_to
event type: detection / risk_change / emergency_transition / snapshot / operator_action
camera_id
```

## Suggested Animations

```text
New event slide-in
: Event mới trượt nhẹ từ trên xuống.

High/Critical glow
: HIGH đỏ nhẹ, CRITICAL flashing viền đậm.

Snapshot hover zoom
: Operator rê chuột để xem chi tiết snapshot.

Timeline pulse dot
: Dot bên trái nhấp nháy khi event chưa acknowledge.
```

## Event Replay Ideas

Mức cơ bản:

```text
- Click event để xem snapshot.
- Hiển thị metadata đầy đủ.
- Link tới detection boxes/risk score tại thời điểm đó.
```

Mức nâng cao:

```text
- Lưu short clip 5 giây trước/sau incident.
- Replay theo camera timeline.
- Overlay lại bounding boxes và risk score trên snapshot/video.
- Export incident report PDF.
```

## Enterprise Dashboard Ideas

```text
Incident command center
: Bản đồ camera, risk heatmap, active emergency queue.

Audit trail
: Ai acknowledge, ai resolve, thời gian xử lý bao lâu.

SLA metrics
: Mean time to acknowledge, mean time to resolve.

Camera health
: Online/offline, FPS, model latency, last frame timestamp.

Evidence package
: Snapshot, risk score chart, event timeline, operator notes.
```

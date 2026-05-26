# Hướng Dẫn Chuẩn Bị Dataset Và Train YOLOv11

Tài liệu này hướng dẫn train model `fire.pt` cho project PhoenixVision AI bằng YOLOv11.

## 1. Cài thư viện

```bash
cd ai-service
source .venv/bin/activate
pip install -r requirements.txt
```

Trên Windows:

```powershell
cd ai-service
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Cấu trúc label YOLO cần có

Project dùng object detection với 2 class:

```text
0 = fire
1 = smoke
```

Mỗi ảnh cần có một file label `.txt` cùng tên:

```text
images/train/example.jpg
labels/train/example.txt
```

Nội dung label theo chuẩn YOLO:

```text
class_id x_center y_center width height
```

Tất cả tọa độ được normalize trong khoảng `0..1`.

Với ảnh non-fire, file `.txt` để rỗng:

```text
images/train/no_fire_001.jpg
labels/train/no_fire_001.txt
```

## 3. Tải và chuẩn bị dataset indoor chính

Script dưới đây sẽ tải dataset Kaggle `Indoor Fire & Smoke Detection with YOLOv8`, gom về cấu trúc YOLO chuẩn và tạo `data.yaml`.

```bash
python -m app.training.prepare_dataset --download-indoor
```

Dataset sau khi xử lý nằm tại:

```text
datasets/fire_smoke/
├── images/
│   ├── train/
│   ├── val/
│   └── test/
├── labels/
│   ├── train/
│   ├── val/
│   └── test/
└── data.yaml
```

## 4. Bổ sung dataset outdoor smoke/non-fire

Dataset bạn gửi:

```python
import kagglehub

path = kagglehub.dataset_download("amerzishminha/forest-fire-smoke-and-non-fire-image-dataset")
print("Path to dataset files:", path)
```

Dataset này có `Smoke`, `Fire`, `Non Fire`, nhưng chủ yếu là outdoor và thường là dạng folder ảnh phân loại, không phải bbox YOLO. Vì vậy cách dùng an toàn nhất là lấy `Non Fire` làm negative samples để giảm false positive.

Lệnh khuyến nghị:

```bash
python -m app.training.prepare_dataset \
  --download-indoor \
  --download-forest-classification \
  --classification-mode negative-only \
  --classification-limit 1200
```

Nếu muốn thử dùng cả ảnh `Fire` và `Smoke` outdoor, có thể bật pseudo-box. Khi đó script tạo bbox toàn ảnh cho fire/smoke. Cách này chỉ nên dùng thử nghiệm, không nên xem là annotation chuẩn.

```bash
python -m app.training.prepare_dataset \
  --download-indoor \
  --download-forest-classification \
  --classification-mode pseudo-boxes \
  --classification-limit 800
```

## 5. Bổ sung dataset YOLO smoke hoặc fire/smoke khác

Nếu có thêm dataset YOLO khác, truyền bằng `--extra-yolo`.

Ví dụ với D-Fire enhanced, dataset đó thường dùng:

```text
0 = smoke
1 = fire
```

Trong project này ta dùng:

```text
0 = fire
1 = smoke
```

Vì vậy cần map lại class:

```bash
python -m app.training.prepare_dataset \
  --download-indoor \
  --extra-yolo /duong-dan/toi/d-fire \
  --extra-class-map "0:1,1:0"
```

Nếu có folder ảnh non-fire, thêm bằng `--negative-dir`.

```bash
python -m app.training.prepare_dataset \
  --download-indoor \
  --negative-dir /duong-dan/toi/non-fireimages \
  --negative-limit 500
```

Với ảnh non-fire, script sẽ tự tạo label `.txt` rỗng để YOLO hiểu rằng ảnh không chứa `fire` hoặc `smoke`.

## 6. Cấu hình train YOLOv11

File cấu hình mặc định:

```text
ai-service/configs/yolo11n_fire_smoke_train.yaml
```

Các lựa chọn chính:

- `model: yolo11n.pt` là model nhẹ nhất phù hợp realtime webcam.
- `imgsz: 640` cân bằng tốc độ và độ chính xác.
- `patience: 20` dừng sớm nếu validation không cải thiện.
- `weight_decay: 0.0005` giảm overfitting.
- `close_mosaic: 10` tắt mosaic ở cuối training để ổn định fine-tune.
- Augmentation nhẹ để không làm biến dạng lửa/khói quá mức.

## 7. Train model

Train bằng config mặc định:

```bash
python -m app.training.train_yolo
```

Hoặc truyền tham số thủ công:

```bash
python -m app.training.train_yolo \
  --data ../datasets/fire_smoke/data.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 8 \
  --device cpu
```

Nếu dùng Mac Apple Silicon và PyTorch hỗ trợ MPS:

```bash
python -m app.training.train_yolo \
  --data ../datasets/fire_smoke/data.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 8 \
  --device mps
```

Nếu có GPU NVIDIA:

```bash
python -m app.training.train_yolo \
  --data ../datasets/fire_smoke/data.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 16 \
  --device 0
```

Sau khi train xong, script tự copy model tốt nhất về:

```text
ai-service/models/fire.pt
```

Script cũng export thêm ONNX để phục vụ deploy tối ưu:

```text
runs/fire_smoke/yolo11n_fire_smoke/weights/best.onnx
```

## 8. Test webcam

```bash
python -m app.realtime_webcam --model models/fire.pt --camera 0
```

Nếu model nhận nhầm đèn vàng, ánh nắng, vật màu đỏ/cam thành lửa, hãy bổ sung thêm ảnh non-fire trong phòng rồi train lại.

## 9. Chiến lược chống overfitting

- Dùng `yolo11n.pt` trước, không bắt đầu bằng model lớn.
- Giữ validation/test tách cảnh, tránh ảnh gần giống nhau từ cùng video xuất hiện ở cả train và val.
- Thêm ảnh non-fire trong phòng: đèn vàng, đèn LED, ánh nắng, vật màu cam/đỏ, bếp, màn hình sáng.
- Không dùng quá nhiều pseudo-box outdoor vì có thể làm model học sai vị trí object.
- Theo dõi `val/box_loss`, `val/cls_loss`, `mAP50`, `precision`, `recall`.
- Nếu train loss giảm nhưng val mAP giảm, giảm epoch, tăng negative samples hoặc tăng dữ liệu indoor đa dạng.

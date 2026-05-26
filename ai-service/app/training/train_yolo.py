from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import yaml
from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    base_parser = argparse.ArgumentParser(add_help=False)
    base_parser.add_argument("--config", default="configs/yolo11n_fire_smoke_train.yaml", help="File YAML cấu hình train.")
    config_args, _ = base_parser.parse_known_args()
    config_defaults = load_config_defaults(Path(config_args.config))

    parser = argparse.ArgumentParser(description="Train YOLOv11 fire/smoke model.")
    parser.add_argument("--config", default=config_args.config, help="File YAML cấu hình train.")
    parser.add_argument("--data", default="../datasets/fire_smoke/data.yaml", help="Đường dẫn data.yaml.")
    parser.add_argument("--model", default="yolo11n.pt", help="Model YOLO base để fine-tune.")
    parser.add_argument("--epochs", type=int, default=100, help="Số epoch train.")
    parser.add_argument("--imgsz", type=int, default=640, help="Kích thước ảnh train.")
    parser.add_argument("--batch", type=int, default=8, help="Batch size.")
    parser.add_argument("--device", default=None, help="cpu, mps hoặc 0 nếu dùng CUDA.")
    parser.add_argument("--project", default="runs/fire_smoke", help="Thư mục lưu runs.")
    parser.add_argument("--name", default="yolo11n_fire_smoke", help="Tên run.")
    parser.add_argument("--patience", type=int, default=20, help="Early stopping patience.")
    parser.add_argument("--workers", type=int, default=4, help="Số worker đọc dữ liệu.")
    parser.add_argument("--weight-decay", type=float, default=0.0005, help="Weight decay để giảm overfit.")
    parser.add_argument("--dropout", type=float, default=0.0, help="Dropout nếu model hỗ trợ.")
    parser.add_argument("--close-mosaic", type=int, default=10, help="Tắt mosaic ở N epoch cuối để ổn định fine-tune.")
    parser.add_argument("--cos-lr", action="store_true", default=True, help="Dùng cosine learning rate.")
    parser.add_argument("--no-cos-lr", action="store_false", dest="cos_lr", help="Tắt cosine learning rate.")
    parser.add_argument("--degrees", type=float, default=3.0, help="Augmentation xoay ảnh nhẹ.")
    parser.add_argument("--translate", type=float, default=0.08, help="Augmentation dịch ảnh.")
    parser.add_argument("--scale", type=float, default=0.35, help="Augmentation scale.")
    parser.add_argument("--fliplr", type=float, default=0.5, help="Xác suất flip ngang.")
    parser.add_argument("--hsv-v", type=float, default=0.25, help="Augmentation brightness.")
    parser.add_argument("--export", default="models/fire.pt", help="Nơi copy best.pt sau khi train.")
    parser.add_argument(
        "--export-format",
        action="append",
        default=["onnx"],
        help="Format export thêm, ví dụ --export-format onnx. Có thể truyền nhiều lần.",
    )
    parser.set_defaults(**config_defaults)
    return parser.parse_args()


def load_config_defaults(config_path: Path) -> dict:
    if not config_path.exists():
        return {}

    with config_path.open("r", encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}

    normalized = {}
    for key, value in config.items():
        normalized[key.replace("-", "_")] = value
    return normalized


def main() -> None:
    args = parse_args()
    model = YOLO(args.model)

    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
        patience=args.patience,
        workers=args.workers,
        weight_decay=args.weight_decay,
        dropout=args.dropout,
        close_mosaic=args.close_mosaic,
        cos_lr=args.cos_lr,
        degrees=args.degrees,
        translate=args.translate,
        scale=args.scale,
        fliplr=args.fliplr,
        hsv_v=args.hsv_v,
        cache=False,
    )

    save_dir = Path(results.save_dir)
    best_weight = save_dir / "weights" / "best.pt"
    if not best_weight.exists():
        raise FileNotFoundError(f"Không tìm thấy best.pt tại: {best_weight}")

    export_path = Path(args.export)
    export_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best_weight, export_path)

    print(f"Train xong: {best_weight}")
    print(f"Đã copy model tốt nhất tới: {export_path}")
    export_model(best_weight, args.export_format, args.imgsz)
    print("Test webcam bằng lệnh:")
    print(f"python -m app.realtime_webcam --model {export_path.as_posix()} --camera 0")


def export_model(best_weight: Path, formats: list[str], imgsz: int) -> None:
    model = YOLO(str(best_weight))
    for export_format in formats:
        if export_format == "pt":
            continue
        exported = model.export(format=export_format, imgsz=imgsz)
        print(f"Đã export {export_format}: {exported}")


if __name__ == "__main__":
    main()

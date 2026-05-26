from __future__ import annotations

import argparse
import random
import shutil
from dataclasses import dataclass
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
DEFAULT_INDOOR_DATASET = "sinchanashivanand/indoor-fire-and-smoke-detection-with-yolov8"
DEFAULT_FOREST_CLASSIFICATION_DATASET = "amerzishminha/forest-fire-smoke-and-non-fire-image-dataset"
DEFAULT_NAMES = {0: "fire", 1: "smoke"}


@dataclass(frozen=True)
class YoloSource:
    name: str
    root: Path
    class_map: dict[int, int]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Chuẩn bị dataset fire/smoke YOLO cho training.")
    parser.add_argument("--output", default="../datasets/fire_smoke", help="Thư mục dataset YOLO sau khi gom.")
    parser.add_argument("--download-indoor", action="store_true", help="Tải dataset indoor từ Kaggle bằng kagglehub.")
    parser.add_argument("--indoor-path", help="Đường dẫn dataset indoor đã tải sẵn.")
    parser.add_argument(
        "--download-forest-classification",
        action="store_true",
        help="Tải dataset Forest Fire/Smoke/Non-Fire từ Kaggle để bổ sung negative/pseudo labels.",
    )
    parser.add_argument(
        "--classification-root",
        action="append",
        default=[],
        help="Dataset dạng folder class Fire/Smoke/Non Fire, có thể truyền nhiều lần.",
    )
    parser.add_argument(
        "--classification-mode",
        choices=["negative-only", "pseudo-boxes"],
        default="negative-only",
        help="negative-only chỉ lấy Non Fire làm ảnh âm; pseudo-boxes tạo box toàn ảnh cho Fire/Smoke.",
    )
    parser.add_argument(
        "--classification-limit",
        type=int,
        default=1200,
        help="Số ảnh tối đa lấy từ mỗi folder class trong dataset phân loại.",
    )
    parser.add_argument("--extra-yolo", action="append", default=[], help="Dataset YOLO bổ sung, có thể truyền nhiều lần.")
    parser.add_argument(
        "--extra-class-map",
        action="append",
        default=[],
        help="Map class cho extra-yolo, ví dụ '0:1,1:0' nếu source có 0=smoke,1=fire.",
    )
    parser.add_argument("--negative-dir", action="append", default=[], help="Folder ảnh non-fire, có thể truyền nhiều lần.")
    parser.add_argument("--negative-limit", type=int, default=500, help="Số ảnh negative tối đa lấy từ mỗi folder.")
    parser.add_argument("--seed", type=int, default=42, help="Seed để split negative samples.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    random.seed(args.seed)

    reset_output(output)

    indoor_root = resolve_indoor_root(args)
    sources: list[YoloSource] = []
    if indoor_root:
        sources.append(YoloSource(name="indoor", root=indoor_root, class_map={0: 0, 1: 1}))

    extra_maps = build_extra_maps(args.extra_yolo, args.extra_class_map)
    for index, extra_path in enumerate(args.extra_yolo):
        root = find_yolo_root(Path(extra_path).expanduser().resolve())
        sources.append(YoloSource(name=f"extra_{index + 1}", root=root, class_map=extra_maps[index]))

    classification_roots = resolve_classification_roots(args)

    if not sources and not args.negative_dir and not classification_roots:
        raise SystemExit("Chưa có dataset nào. Dùng --download-indoor hoặc --indoor-path.")

    for source in sources:
        copy_yolo_source(source, output)

    for index, negative_dir in enumerate(args.negative_dir):
        copy_negative_images(
            source_dir=Path(negative_dir).expanduser().resolve(),
            output=output,
            prefix=f"negative_{index + 1}",
            limit=args.negative_limit,
        )

    for index, classification_root in enumerate(classification_roots):
        copy_classification_source(
            source_dir=classification_root,
            output=output,
            prefix=f"classification_{index + 1}",
            mode=args.classification_mode,
            limit=args.classification_limit,
        )

    write_data_yaml(output)
    print_summary(output)


def resolve_indoor_root(args: argparse.Namespace) -> Path | None:
    if args.indoor_path:
        return find_yolo_root(Path(args.indoor_path).expanduser().resolve())

    if args.download_indoor:
        import kagglehub

        downloaded = kagglehub.dataset_download(DEFAULT_INDOOR_DATASET)
        return find_yolo_root(Path(downloaded).resolve())

    return None


def resolve_classification_roots(args: argparse.Namespace) -> list[Path]:
    roots = [Path(path).expanduser().resolve() for path in args.classification_root]

    if args.download_forest_classification:
        import kagglehub

        downloaded = kagglehub.dataset_download(DEFAULT_FOREST_CLASSIFICATION_DATASET)
        roots.append(Path(downloaded).resolve())

    return roots


def build_extra_maps(extra_yolo: list[str], class_maps: list[str]) -> list[dict[int, int]]:
    maps: list[dict[int, int]] = []
    for index, _ in enumerate(extra_yolo):
        if index < len(class_maps):
            maps.append(parse_class_map(class_maps[index]))
        else:
            maps.append({0: 0, 1: 1})
    return maps


def parse_class_map(raw: str) -> dict[int, int]:
    mapping: dict[int, int] = {}
    for pair in raw.split(","):
        source, target = pair.split(":")
        mapping[int(source.strip())] = int(target.strip())
    return mapping


def reset_output(output: Path) -> None:
    if output.exists():
        shutil.rmtree(output)

    for split in ("train", "val", "test"):
        (output / "images" / split).mkdir(parents=True, exist_ok=True)
        (output / "labels" / split).mkdir(parents=True, exist_ok=True)


def find_yolo_root(path: Path) -> Path:
    candidates = [path, path / "dataset", path / "data"]
    for candidate in candidates:
        if has_yolo_splits(candidate):
            return candidate

    raise FileNotFoundError(f"Không tìm thấy cấu trúc YOLO train/valid/test trong: {path}")


def has_yolo_splits(path: Path) -> bool:
    for split in ("train", "valid", "val", "test"):
        if (path / split / "images").exists() and (path / split / "labels").exists():
            return True
    return False


def copy_yolo_source(source: YoloSource, output: Path) -> None:
    for source_split, target_split in (("train", "train"), ("valid", "val"), ("val", "val"), ("test", "test")):
        image_dir = source.root / source_split / "images"
        label_dir = source.root / source_split / "labels"
        if not image_dir.exists() or not label_dir.exists():
            continue

        for image_path in iter_images(image_dir):
            label_path = label_dir / f"{image_path.stem}.txt"
            target_stem = f"{source.name}_{source_split}_{image_path.stem}"
            target_image = output / "images" / target_split / f"{target_stem}{image_path.suffix.lower()}"
            target_label = output / "labels" / target_split / f"{target_stem}.txt"

            shutil.copy2(image_path, target_image)
            remap_label_file(label_path, target_label, source.class_map)


def remap_label_file(source_label: Path, target_label: Path, class_map: dict[int, int]) -> None:
    if not source_label.exists():
        target_label.write_text("", encoding="utf-8")
        return

    lines: list[str] = []
    for line in source_label.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        parts = stripped.split()
        source_class = int(float(parts[0]))
        if source_class not in class_map:
            continue

        parts[0] = str(class_map[source_class])
        lines.append(" ".join(parts))

    target_label.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")


def copy_negative_images(source_dir: Path, output: Path, prefix: str, limit: int) -> None:
    images = list(iter_images(source_dir))
    random.shuffle(images)
    selected = images[:limit] if limit > 0 else images

    for index, image_path in enumerate(selected):
        split = choose_split(index, len(selected))
        target_stem = f"{prefix}_{image_path.stem}"
        target_image = output / "images" / split / f"{target_stem}{image_path.suffix.lower()}"
        target_label = output / "labels" / split / f"{target_stem}.txt"

        shutil.copy2(image_path, target_image)
        target_label.write_text("", encoding="utf-8")


def copy_classification_source(source_dir: Path, output: Path, prefix: str, mode: str, limit: int) -> None:
    class_dirs = find_class_dirs(source_dir)
    if not class_dirs:
        print(f"Bỏ qua dataset phân loại vì không tìm thấy folder Fire/Smoke/Non Fire: {source_dir}")
        return

    for class_name, class_dir in class_dirs.items():
        images = list(iter_images(class_dir))
        random.shuffle(images)
        selected = images[:limit] if limit > 0 else images

        if class_name == "non_fire":
            label_class = None
        elif mode == "pseudo-boxes":
            label_class = 0 if class_name == "fire" else 1
        else:
            print(f"Bỏ qua folder {class_dir.name} vì --classification-mode=negative-only.")
            continue

        for index, image_path in enumerate(selected):
            split = choose_split(index, len(selected))
            target_stem = f"{prefix}_{class_name}_{image_path.stem}_{index}"
            target_image = output / "images" / split / f"{target_stem}{image_path.suffix.lower()}"
            target_label = output / "labels" / split / f"{target_stem}.txt"

            shutil.copy2(image_path, target_image)
            if label_class is None:
                target_label.write_text("", encoding="utf-8")
            else:
                target_label.write_text(f"{label_class} 0.5 0.5 1.0 1.0\n", encoding="utf-8")


def find_class_dirs(source_dir: Path) -> dict[str, Path]:
    class_dirs: dict[str, Path] = {}
    for candidate in source_dir.rglob("*"):
        if not candidate.is_dir():
            continue

        normalized = normalize_class_name(candidate.name)
        if normalized and normalized not in class_dirs:
            class_dirs[normalized] = candidate

    return class_dirs


def normalize_class_name(name: str) -> str | None:
    normalized = name.lower().replace("_", " ").replace("-", " ")
    compact = " ".join(normalized.split())

    if "non" in compact and "fire" in compact:
        return "non_fire"
    if compact == "normal" or "no disaster" in compact:
        return "non_fire"
    if "smoke" in compact:
        return "smoke"
    if "fire" in compact:
        return "fire"
    return None


def choose_split(index: int, total: int) -> str:
    ratio = index / max(total, 1)
    if ratio < 0.8:
        return "train"
    if ratio < 0.9:
        return "val"
    return "test"


def iter_images(path: Path) -> list[Path]:
    if not path.exists():
        return []
    return sorted(item for item in path.rglob("*") if item.suffix.lower() in IMAGE_EXTENSIONS)


def write_data_yaml(output: Path) -> None:
    yaml = "\n".join(
        [
            f"path: {output.as_posix()}",
            "train: images/train",
            "val: images/val",
            "test: images/test",
            "",
            "names:",
            f"  0: {DEFAULT_NAMES[0]}",
            f"  1: {DEFAULT_NAMES[1]}",
            "",
        ]
    )
    (output / "data.yaml").write_text(yaml, encoding="utf-8")


def print_summary(output: Path) -> None:
    print(f"Dataset đã tạo tại: {output}")
    print(f"File cấu hình: {output / 'data.yaml'}")
    for split in ("train", "val", "test"):
        image_count = len(iter_images(output / "images" / split))
        label_count = len(list((output / "labels" / split).glob("*.txt")))
        print(f"- {split}: {image_count} ảnh, {label_count} label")


if __name__ == "__main__":
    main()

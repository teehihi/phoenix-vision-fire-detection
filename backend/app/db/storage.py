import base64
import binascii
import re
from urllib.parse import urlparse

from firebase_admin import storage

from app.db.firestore import get_firestore_client

DATA_URL_PATTERN = re.compile(r"^data:(image/(?:jpeg|png|webp));base64,(.+)$", re.DOTALL)
MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024
EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def store_snapshot(user_id: str, event_id: str, snapshot: str | None) -> str | None:
    if not snapshot or not snapshot.startswith("data:"):
        return snapshot

    match = DATA_URL_PATTERN.match(snapshot)
    if not match:
        raise ValueError("Snapshot phải là ảnh JPEG, PNG hoặc WebP dạng Base64.")

    content_type, encoded_data = match.groups()
    try:
        image_bytes = base64.b64decode(encoded_data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Snapshot Base64 không hợp lệ.") from exc

    if not image_bytes:
        raise ValueError("Snapshot không có dữ liệu.")
    if len(image_bytes) > MAX_SNAPSHOT_BYTES:
        raise ValueError("Snapshot vượt quá giới hạn 5 MB.")

    get_firestore_client()
    object_name = f"users/{user_id}/snapshots/{event_id}.{EXTENSIONS[content_type]}"
    bucket = storage.bucket()
    blob = bucket.blob(object_name)
    blob.upload_from_string(image_bytes, content_type=content_type, timeout=30)
    blob.metadata = {"ownerUid": user_id, "eventId": event_id}
    blob.patch()
    return f"gs://{bucket.name}/{object_name}"


def delete_snapshot(user_id: str, snapshot_url: str | None) -> None:
    object_name = _owned_object_name(user_id, snapshot_url)
    if not object_name:
        return

    get_firestore_client()
    blob = storage.bucket().blob(object_name)
    if blob.exists():
        blob.delete()


def clear_user_snapshots(user_id: str) -> None:
    get_firestore_client()
    bucket = storage.bucket()
    for blob in bucket.list_blobs(prefix=f"users/{user_id}/snapshots/"):
        blob.delete()


def _owned_object_name(user_id: str, snapshot_url: str | None) -> str | None:
    if not snapshot_url or not snapshot_url.startswith("gs://"):
        return None

    object_name = urlparse(snapshot_url).path.lstrip("/")
    expected_prefix = f"users/{user_id}/snapshots/"
    return object_name if object_name.startswith(expected_prefix) else None

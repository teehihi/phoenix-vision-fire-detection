import json
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import Client, CollectionReference

from app.core.config import BACKEND_ROOT, settings


@lru_cache
def get_firestore_client() -> Client:
    try:
        app = firebase_admin.get_app()
    except ValueError:
        credential = _get_firebase_credential()
        options = {}
        if settings.firebase_project_id:
            options["projectId"] = settings.firebase_project_id
        if settings.firebase_storage_bucket:
            options["storageBucket"] = settings.firebase_storage_bucket
        app = firebase_admin.initialize_app(credential, options)

    return firestore.client(app)


def get_collection(name: str) -> CollectionReference:
    return get_firestore_client().collection(name)


def get_user_collection(user_id: str, name: str) -> CollectionReference:
    return get_collection("users").document(user_id).collection(name)


def with_expiration(data: dict) -> dict:
    return {
        **data,
        "expireAt": datetime.now(timezone.utc) + timedelta(days=settings.data_retention_days),
    }


def delete_collection(collection: CollectionReference, batch_size: int = 400) -> None:
    while True:
        documents = list(collection.limit(batch_size).stream())
        if not documents:
            return

        batch = get_firestore_client().batch()
        for document in documents:
            batch.delete(document.reference)
        batch.commit()


def _get_firebase_credential():
    if settings.firebase_service_account_json:
        try:
            service_account = json.loads(settings.firebase_service_account_json)
        except json.JSONDecodeError as exc:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ.") from exc
        return credentials.Certificate(service_account)

    if settings.firebase_service_account_path:
        credential_path = Path(settings.firebase_service_account_path).expanduser()
        if not credential_path.is_absolute():
            credential_path = BACKEND_ROOT / credential_path
        if not credential_path.is_file():
            raise RuntimeError(f"Không tìm thấy Firebase service account: {credential_path}")
        return credentials.Certificate(str(credential_path))

    try:
        return credentials.ApplicationDefault()
    except Exception as exc:
        raise RuntimeError(
            "Backend chưa có Firebase credentials. Hãy cấu hình "
            "FIREBASE_SERVICE_ACCOUNT_PATH hoặc FIREBASE_SERVICE_ACCOUNT_JSON."
        ) from exc

from fastapi import Header, HTTPException, status
from firebase_admin import auth

from app.core.config import settings
from app.db.firestore import get_firestore_client


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thiếu Firebase ID token.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header không hợp lệ.")

    if token == settings.demo_auth_token:
        return settings.demo_user_id

    try:
        get_firestore_client()
        decoded_token = auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase ID token không hợp lệ hoặc đã hết hạn.") from exc

    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase ID token không có UID.")
    return user_id

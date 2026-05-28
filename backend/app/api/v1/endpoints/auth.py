import base64
import hashlib
import hmac
import json
import logging
import secrets
import smtplib
import time
from email.message import EmailMessage
from email.utils import formataddr

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class RegistrationOtpRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)


class RegistrationOtpResponse(BaseModel):
    challenge_token: str
    expires_in_seconds: int


class RegistrationOtpVerifyRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    otp: str = Field(min_length=6, max_length=6)
    challenge_token: str


class RegistrationOtpVerifyResponse(BaseModel):
    verified: bool


@router.post("/registration-otp", response_model=RegistrationOtpResponse)
def request_registration_otp(payload: RegistrationOtpRequest) -> RegistrationOtpResponse:
    email = normalize_email(payload.email)
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email không hợp lệ.")

    otp = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = int(time.time()) + settings.otp_expire_minutes * 60
    nonce = secrets.token_urlsafe(16)
    challenge_token = create_challenge_token(email=email, otp=otp, nonce=nonce, expires_at=expires_at)

    try:
        send_otp_email(email, otp)
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("Unable to send PhoenixVision registration OTP email.")
        raise HTTPException(status_code=502, detail="Không gửi được email OTP. Vui lòng kiểm tra SMTP hoặc mật khẩu ứng dụng Gmail.") from exc

    return RegistrationOtpResponse(
        challenge_token=challenge_token,
        expires_in_seconds=settings.otp_expire_minutes * 60,
    )


@router.post("/registration-otp/verify", response_model=RegistrationOtpVerifyResponse)
def verify_registration_otp(payload: RegistrationOtpVerifyRequest) -> RegistrationOtpVerifyResponse:
    email = normalize_email(payload.email)
    claims = verify_challenge_token(payload.challenge_token)
    if claims["email"] != email:
        raise HTTPException(status_code=400, detail="Mã xác minh không khớp với email đăng ký.")

    expected_hash = claims["otp_hash"]
    actual_hash = hash_otp(email=email, otp=payload.otp, nonce=claims["nonce"], expires_at=claims["exp"])
    if not hmac.compare_digest(expected_hash, actual_hash):
        raise HTTPException(status_code=400, detail="Mã OTP không đúng.")

    return RegistrationOtpVerifyResponse(verified=True)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_challenge_token(email: str, otp: str, nonce: str, expires_at: int) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "email": email,
        "nonce": nonce,
        "exp": expires_at,
        "otp_hash": hash_otp(email=email, otp=otp, nonce=nonce, expires_at=expires_at),
    }
    encoded_header = base64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = base64_url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = sign_token(f"{encoded_header}.{encoded_payload}")
    return f"{encoded_header}.{encoded_payload}.{signature}"


def verify_challenge_token(token: str) -> dict:
    try:
        encoded_header, encoded_payload, signature = token.split(".")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Phiên xác minh không hợp lệ.") from exc

    expected_signature = sign_token(f"{encoded_header}.{encoded_payload}")
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=400, detail="Phiên xác minh không hợp lệ.")

    try:
        claims = json.loads(base64_url_decode(encoded_payload))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Phiên xác minh không hợp lệ.") from exc

    if int(claims.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn.")

    required_fields = {"email", "nonce", "exp", "otp_hash"}
    if not required_fields.issubset(claims):
        raise HTTPException(status_code=400, detail="Phiên xác minh không hợp lệ.")

    return claims


def hash_otp(email: str, otp: str, nonce: str, expires_at: int) -> str:
    message = f"{email}:{otp}:{nonce}:{expires_at}".encode("utf-8")
    return hmac.new(settings.otp_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def sign_token(unsigned_token: str) -> str:
    digest = hmac.new(settings.otp_secret.encode("utf-8"), unsigned_token.encode("utf-8"), hashlib.sha256).digest()
    return base64_url_encode(digest)


def base64_url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def base64_url_decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}").decode("utf-8")


def send_otp_email(email: str, otp: str) -> None:
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        logger.warning("PhoenixVision registration OTP for %s: %s", email, otp)
        return

    message = EmailMessage()
    message["Subject"] = "Mã xác minh đăng ký - PhoenixVision"
    message["From"] = formataddr((settings.smtp_from_name, settings.smtp_from_email or settings.smtp_username))
    message["To"] = email
    text_body = "\n".join(
        [
            "PhoenixVision",
            "",
            "Xin chào,",
            "",
            f"Mã xác minh đăng ký PhoenixVision của bạn là: {otp}",
            f"Mã này có hiệu lực trong {settings.otp_expire_minutes} phút.",
            "",
            "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.",
            "",
            "PhoenixVision - Quan sát thông minh, cảnh báo tức thì.",
        ]
    )
    message.set_content(text_body)
    message.add_alternative(
        "\n".join(
            [
                "<!doctype html>",
                '<html lang="vi">',
                "<head>",
                '  <meta charset="utf-8">',
                '  <meta name="viewport" content="width=device-width, initial-scale=1">',
                "  <title>Mã xác minh PhoenixVision</title>",
                "</head>",
                '<body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">',
                '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">',
                "    <tr>",
                '      <td align="center">',
                '        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.08);">',
                "          <tr>",
                '            <td style="background:linear-gradient(135deg,#fff7ed,#ffffff);padding:28px 32px 20px;border-bottom:1px solid #fed7aa;">',
                '              <div style="font-size:12px;font-weight:800;letter-spacing:4px;color:#ea580c;text-transform:uppercase;">PhoenixVision</div>',
                '              <h1 style="margin:12px 0 8px;font-size:26px;line-height:1.2;color:#020617;">Xác minh email đăng ký</h1>',
                '              <p style="margin:0;font-size:15px;line-height:1.6;color:#64748b;">Quan sát thông minh, cảnh báo tức thì.</p>',
                "            </td>",
                "          </tr>",
                "          <tr>",
                '            <td style="padding:32px;">',
                '              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">Xin chào, PhoenixVision nhận được yêu cầu tạo tài khoản mới bằng email này. Vui lòng nhập mã bên dưới để hoàn tất đăng ký.</p>',
                '              <div style="margin:24px 0;padding:22px;border-radius:20px;background:#fff7ed;border:1px solid #fdba74;text-align:center;">',
                '                <div style="font-size:12px;font-weight:700;letter-spacing:3px;color:#c2410c;text-transform:uppercase;">Mã OTP của bạn</div>',
                f'                <div style="margin-top:10px;font-size:42px;line-height:1;font-weight:800;letter-spacing:10px;color:#ea580c;">{otp}</div>',
                f'                <div style="margin-top:12px;font-size:13px;color:#9a3412;">Mã có hiệu lực trong {settings.otp_expire_minutes} phút.</div>',
                "              </div>",
                '              <div style="padding:16px 18px;border-radius:16px;background:#f1f5f9;border:1px solid #e2e8f0;">',
                '                <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;"><strong>Lưu ý bảo mật:</strong> PhoenixVision không bao giờ yêu cầu bạn gửi lại mã OTP qua email, tin nhắn hoặc cuộc gọi. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>',
                "              </div>",
                '              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">Email này được gửi tự động từ hệ thống xác minh PhoenixVision.</p>',
                "            </td>",
                "          </tr>",
                "        </table>",
                '        <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">PhoenixVision - See, Detect, Protect</p>',
                "      </td>",
                "    </tr>",
                "  </table>",
                "</body>",
                "</html>",
            ]
        ),
        subtype="html",
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)

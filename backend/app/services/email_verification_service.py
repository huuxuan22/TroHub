from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import smtplib
from dataclasses import dataclass
from datetime import datetime, timedelta
from email.message import EmailMessage

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models import EmailVerificationCode
from app.services.auth_service import SECRET_KEY

load_dotenv()

REGISTRATION_PURPOSE = "registration"
MAX_VERIFY_ATTEMPTS = 5


class EmailVerificationDeliveryError(Exception):
    pass


@dataclass(frozen=True)
class EmailSenderConfig:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    from_name: str
    use_tls: bool
    use_ssl: bool
    timeout_seconds: float


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _email_config() -> EmailSenderConfig:
    username = (os.getenv("SMTP_USERNAME") or os.getenv("GMAIL_ADDRESS") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD") or "").strip()
    from_email = (os.getenv("SMTP_FROM_EMAIL") or username).strip()
    return EmailSenderConfig(
        host=(os.getenv("SMTP_HOST") or "smtp.gmail.com").strip(),
        port=int(os.getenv("SMTP_PORT") or "587"),
        username=username,
        password=password,
        from_email=from_email,
        from_name=(os.getenv("SMTP_FROM_NAME") or "TroHub").strip(),
        use_tls=_env_bool("SMTP_USE_TLS", True),
        use_ssl=_env_bool("SMTP_USE_SSL", False),
        timeout_seconds=float(os.getenv("SMTP_TIMEOUT_SECONDS") or "10"),
    )


def _verification_expiry() -> datetime:
    minutes = int(os.getenv("EMAIL_VERIFICATION_EXPIRE_MINUTES") or "10")
    return datetime.utcnow() + timedelta(minutes=max(minutes, 1))


def _normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_code(email: str, purpose: str, code: str) -> str:
    payload = f"{_normalize_email(email)}:{purpose}:{code}".encode("utf-8")
    return hmac.new(SECRET_KEY.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _send_verification_email(email: str, code: str) -> None:
    config = _email_config()
    if not config.username or not config.password or not config.from_email:
        raise EmailVerificationDeliveryError("Chưa cấu hình Gmail SMTP để gửi mã xác thực.")

    message = EmailMessage()
    message["Subject"] = "Mã xác thực đăng ký TroHub"
    message["From"] = f"{config.from_name} <{config.from_email}>"
    message["To"] = email
    message.set_content(
        "\n".join(
            [
                "Chào bạn,",
                "",
                f"Mã xác thực đăng ký TroHub của bạn là: {code}",
                "Mã có hiệu lực trong vài phút. Không chia sẻ mã này cho người khác.",
                "",
                "TroHub",
            ]
        )
    )

    try:
        if config.use_ssl:
            with smtplib.SMTP_SSL(config.host, config.port, timeout=config.timeout_seconds) as server:
                server.login(config.username, config.password)
                server.send_message(message)
            return

        with smtplib.SMTP(config.host, config.port, timeout=config.timeout_seconds) as server:
            if config.use_tls:
                server.starttls()
            server.login(config.username, config.password)
            server.send_message(message)
    except Exception as exc:
        raise EmailVerificationDeliveryError("Không gửi được mã xác thực qua email.") from exc


def send_registration_code(db: Session, email: str) -> None:
    email_norm = _normalize_email(email)
    code = _generate_code()
    now = datetime.utcnow()

    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == email_norm,
        EmailVerificationCode.purpose == REGISTRATION_PURPOSE,
        EmailVerificationCode.consumed_at.is_(None),
    ).update({EmailVerificationCode.consumed_at: now}, synchronize_session=False)

    db.add(
        EmailVerificationCode(
            email=email_norm,
            purpose=REGISTRATION_PURPOSE,
            code_hash=_hash_code(email_norm, REGISTRATION_PURPOSE, code),
            expires_at=_verification_expiry(),
            created_at=now,
        )
    )

    try:
        _send_verification_email(email_norm, code)
    except Exception:
        db.rollback()
        raise
    db.commit()


def verify_registration_code(db: Session, email: str, code: str) -> None:
    email_norm = _normalize_email(email)
    code_norm = "".join(ch for ch in str(code or "") if ch.isdigit())
    verification = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == email_norm,
            EmailVerificationCode.purpose == REGISTRATION_PURPOSE,
            EmailVerificationCode.consumed_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc(), EmailVerificationCode.id.desc())
        .first()
    )

    if verification is None:
        raise ValueError("Vui lòng lấy mã xác thực email trước khi đăng ký.")
    if verification.expires_at < datetime.utcnow():
        verification.consumed_at = datetime.utcnow()
        db.commit()
        raise ValueError("Mã xác thực đã hết hạn. Vui lòng gửi lại mã mới.")
    if verification.attempts >= MAX_VERIFY_ATTEMPTS:
        verification.consumed_at = datetime.utcnow()
        db.commit()
        raise ValueError("Bạn đã nhập sai mã quá nhiều lần. Vui lòng gửi lại mã mới.")
    if not hmac.compare_digest(verification.code_hash, _hash_code(email_norm, REGISTRATION_PURPOSE, code_norm)):
        verification.attempts += 1
        db.commit()
        raise ValueError("Mã xác thực không đúng.")

    verification.consumed_at = datetime.utcnow()
    db.commit()

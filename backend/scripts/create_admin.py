"""Tạo / nâng cấp một tài khoản admin để truy cập trang quản trị.

Cách dùng (chạy trong thư mục backend, sau khi đã cài requirements và set DATABASE_URL):

    python scripts/create_admin.py --email admin@trohub.local --password "AdminPass123" --name "Admin"

Nếu email đã tồn tại, lệnh sẽ nâng cấp tài khoản đó thành admin và đặt lại mật khẩu (nếu --password truyền vào).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import func

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import User, UserRole, UserStatus
from app.services.users_service import get_password_hash


def upsert_admin(email: str, password: str | None, full_name: str, phone: str | None) -> None:
    email_norm = email.strip().lower()
    with SessionLocal() as db:
        user = db.query(User).filter(func.lower(User.email) == email_norm).first()
        if user:
            user.role = UserRole.ADMIN
            user.status = UserStatus.ACTIVE
            if password:
                user.password_hash = get_password_hash(password)
            if full_name:
                user.full_name = full_name
            if phone:
                user.phone_number = phone
            db.commit()
            print(f"[ok] Đã nâng cấp '{email_norm}' thành ADMIN.")
            return

        if not password:
            raise SystemExit("Tài khoản chưa tồn tại, vui lòng truyền --password để tạo mới.")

        user = User(
            full_name=full_name or "Administrator",
            email=email_norm,
            password_hash=get_password_hash(password),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            phone_number=phone,
        )
        db.add(user)
        db.commit()
        print(f"[ok] Đã tạo admin mới: {email_norm}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tạo/nâng cấp tài khoản admin TroHub.")
    parser.add_argument("--email", required=True, help="Email đăng nhập của admin")
    parser.add_argument("--password", help="Mật khẩu (>=8 ký tự). Bắt buộc nếu tạo mới.")
    parser.add_argument("--name", default="Administrator", help="Tên hiển thị")
    parser.add_argument("--phone", help="Số điện thoại (tuỳ chọn)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.password and len(args.password) < 8:
        raise SystemExit("Mật khẩu phải có ít nhất 8 ký tự.")
    upsert_admin(args.email, args.password, args.name, args.phone)

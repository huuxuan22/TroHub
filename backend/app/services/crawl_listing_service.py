"""Nhận diện tin/phòng crawl và tài khoản landlord ảo — dùng chung messages, chat, rooms."""

from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.models import Room, User

CRAWL_LANDLORD_EMAIL = os.getenv("CRAWL_IMPORT_LANDLORD_EMAIL", "crawler.system@trohub.local").strip()


def is_crawl_source(source: str | None) -> bool:
    return (source or "").strip().lower() == "crawl"


def user_is_crawl_system_account(user: User | None) -> bool:
    if not user or not CRAWL_LANDLORD_EMAIL:
        return False
    return (user.email or "").strip().lower() == CRAWL_LANDLORD_EMAIL.lower()


def room_is_crawled_listing(room: Room, db: Session) -> bool:
    if is_crawl_source(room.source):
        return True
    if room.landlord_id:
        landlord = db.query(User).filter(User.id == room.landlord_id).first()
        if user_is_crawl_system_account(landlord):
            return True
    return False

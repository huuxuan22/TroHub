"""
Job nền: mỗi N giây crawl 1 lần theo `users.address` (round-robin).
Dùng cùng logic POST /crawl/by-filters.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from config import (
    DEFAULT_CRAWL_MAX_ITEMS,
    LIST_URL,
    SCHEDULED_CRAWL_ENABLED,
    SCHEDULED_CRAWL_INTERVAL_SECONDS,
    SCHEDULED_CRAWL_MAX_PAGES,
)
from crawl_service import run_crawl_by_filters_job
from user_addresses import extract_tinh_thanh, list_users_with_address

logger = logging.getLogger("trohub.scheduled_crawl")

_crawl_lock = asyncio.Lock()
_task: asyncio.Task | None = None
_rr_index = 0
_tick_count = 0


@dataclass
class ScheduledCrawlState:
    enabled: bool = False
    interval_seconds: int = 60
    tick_count: int = 0
    last_run_at: str | None = None
    last_user: dict[str, Any] | None = None
    last_result: dict[str, Any] | None = None
    last_error: str | None = None
    running: bool = False
    users_with_address: int = 0


_state = ScheduledCrawlState()


def get_scheduled_state() -> dict[str, Any]:
    s = _state
    return {
        "enabled": s.enabled,
        "interval_seconds": s.interval_seconds,
        "tick_count": s.tick_count,
        "last_run_at": s.last_run_at,
        "last_user": s.last_user,
        "last_result": s.last_result,
        "last_error": s.last_error,
        "running": s.running,
        "users_with_address": s.users_with_address,
    }


def _run_one_scheduled_crawl() -> None:
    global _rr_index, _tick_count

    users = list_users_with_address()
    _state.users_with_address = len(users)

    if not users:
        logger.info("[SCHEDULED] Không có user nào có address — bỏ qua tick")
        _state.last_run_at = datetime.now(timezone.utc).isoformat()
        _state.last_error = None
        _state.last_result = {"skipped": True, "reason": "no_users_with_address"}
        return

    user = users[_rr_index % len(users)]
    _rr_index = (_rr_index + 1) % len(users)
    _tick_count += 1
    _state.tick_count = _tick_count

    address = (user.get("address") or "").strip()
    tinh_thanh = extract_tinh_thanh(address)
    user_id = user.get("id")
    email = user.get("email", "")

    logger.info(
        "[SCHEDULED] Tick #%s | user_id=%s | email=%s | address=%s | tinh_thanh=%s",
        _tick_count,
        user_id,
        email,
        address[:120],
        tinh_thanh or "(không nhận diện — crawl trang chủ)",
    )

    _state.last_user = {
        "id": user_id,
        "email": email,
        "address": address,
        "tinh_thanh": tinh_thanh,
    }
    _state.last_run_at = datetime.now(timezone.utc).isoformat()
    _state.last_error = None

    try:
        result = run_crawl_by_filters_job(
            keyword=None,
            tinh_thanh=tinh_thanh,
            max_pages=SCHEDULED_CRAWL_MAX_PAGES,
            max_items=DEFAULT_CRAWL_MAX_ITEMS,
            list_url=LIST_URL,
            notify_backend=True,
        )
        _state.last_result = result
        logger.info(
            "[SCHEDULED] Xong tick #%s | crawled=%s | saved=%s | matched=%s | source=%s",
            _tick_count,
            result.get("crawled_count"),
            result.get("saved"),
            result.get("matched_count"),
            result.get("source_url"),
        )
    except Exception as exc:  # noqa: BLE001
        _state.last_error = str(exc)
        logger.exception("[SCHEDULED] Lỗi tick #%s: %s", _tick_count, exc)


async def _scheduler_loop() -> None:
    logger.info(
        "[SCHEDULED] Bật job crawl theo users.address — mỗi %ss một lần (feature: /crawl/by-filters)",
        SCHEDULED_CRAWL_INTERVAL_SECONDS,
    )
    while True:
        await asyncio.sleep(SCHEDULED_CRAWL_INTERVAL_SECONDS)
        if _crawl_lock.locked():
            logger.warning("[SCHEDULED] Bỏ qua tick — job trước vẫn đang chạy (crawl > %ss)", SCHEDULED_CRAWL_INTERVAL_SECONDS)
            continue
        async with _crawl_lock:
            _state.running = True
            try:
                await asyncio.to_thread(_run_one_scheduled_crawl)
            finally:
                _state.running = False


def start_scheduled_crawl() -> None:
    global _task
    if not SCHEDULED_CRAWL_ENABLED:
        logger.info("[SCHEDULED] Tắt (SCHEDULED_CRAWL_ENABLED=false)")
        _state.enabled = False
        return
    _state.enabled = True
    _state.interval_seconds = SCHEDULED_CRAWL_INTERVAL_SECONDS
    if _task is not None and not _task.done():
        return
    _task = asyncio.create_task(_scheduler_loop())


async def stop_scheduled_crawl() -> None:
    global _task
    if _task is None:
        return
    _task.cancel()
    try:
        await _task
    except asyncio.CancelledError:
        pass
    _task = None
    logger.info("[SCHEDULED] Đã dừng job nền")

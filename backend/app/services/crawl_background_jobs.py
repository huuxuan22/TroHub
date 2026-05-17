"""Lập lịch job nền (async) gọi logic chuẩn hóa crawl — tách khỏi HTTP handler."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.services.crawl_normalize_transaction import normalize_crawl_urls

logger = logging.getLogger("trohub.crawl_background")


def schedule_normalize_crawl_urls(urls: list[str]) -> None:
    """Chạy chuẩn hóa bất đồng bộ sau khi request trả về (không block event loop)."""

    clean = [u.strip() for u in urls if u and str(u).strip()]
    if not clean:
        return

    async def _runner() -> dict[str, int]:
        return await asyncio.to_thread(normalize_crawl_urls, clean)

    task: asyncio.Task[dict[str, int]] = asyncio.create_task(_runner())

    def _done(t: asyncio.Task[Any]) -> None:
        try:
            r = t.result()
            logger.info("Crawl normalize job xong: %s", r)
        except Exception:
            logger.exception("Crawl normalize job thất bại")

    task.add_done_callback(_done)

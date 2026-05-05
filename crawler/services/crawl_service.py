"""Crawler: fetch HTML, parse with BeautifulSoup, map into CrawlHistory rows."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any

from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from models.crawl_history import CrawlHistory
from services import room_service
from utils.config import Settings, get_settings
from utils.exceptions import CrawlError, ValidationAppError
from utils.http_client import fetch_html

DEMO_HTML = """
<html><body>
  <div class="room-item">
    <div class="title">Studio near campus</div>
    <div class="price">3,500,000 VND / month</div>
    <div class="location">District 1, HCMC</div>
    <img src="https://example.com/a.jpg" alt="" />
    <div class="description">Quiet alley, full furniture.</div>
    <div class="phone">0901-234-567</div>
  </div>
  <div class="room-item">
    <div class="title">Bright attic room</div>
    <div class="price">2.8tr</div>
    <div class="location">Tan Binh</div>
    <img src="https://example.com/b.jpg" />
    <div class="description">Shared kitchen, washing machine.</div>
    <div class="phone">0987654321</div>
  </div>
</body></html>
"""


def _text_or_none(node: Any) -> str | None:
    if node is None:
        return None
    t = node.get_text(separator=" ", strip=True)
    return t or None


def _first_attr(node: Any, attr: str) -> str | None:
    if node is None:
        return None
    val = node.get(attr)
    return str(val).strip() if val else None


def _parse_price(raw: str | None) -> Decimal | None:
    if not raw:
        return None
    digits = re.sub(r"[^\d.,]", "", raw).replace(",", "")
    if not digits:
        return None
    try:
        return Decimal(digits)
    except InvalidOperation:
        return None


def parse_rooms_from_html(html: str, settings: Settings) -> list[CrawlHistory]:
    soup = BeautifulSoup(html, "html.parser")
    items = soup.select(settings.room_item_selector)
    if not items:
        return []

    rows: list[CrawlHistory] = []
    for block in items:
        title_el = block.select_one(settings.room_title_selector)
        title = _text_or_none(title_el)
        if not title:
            continue

        price_raw = _text_or_none(block.select_one(settings.room_price_selector))
        img_el = block.select_one(settings.room_image_selector)
        image = _first_attr(img_el, "src") or _first_attr(img_el, "data-src")

        row = CrawlHistory(
            title=title,
            price=_parse_price(price_raw),
            location=_text_or_none(block.select_one(settings.room_location_selector)),
            image=image,
            description=_text_or_none(
                block.select_one(settings.room_description_selector)
            ),
            phone_number=_text_or_none(block.select_one(settings.room_phone_selector)),
        )
        rows.append(row)
    return rows


def run_crawl(
    db: Session,
    *,
    url: str | None,
    use_demo_html: bool,
) -> dict[str, Any]:
    """Fetch (or use demo HTML), parse listings, save to DB. Returns summary."""
    settings = get_settings()

    if use_demo_html:
        html = DEMO_HTML
        resolved_url = "demo://embedded-html"
    else:
        resolved_url = url or (
            str(settings.default_crawl_url) if settings.default_crawl_url else None
        )
        if not resolved_url:
            raise ValidationAppError(
                "Provide `url` in the request body or set DEFAULT_CRAWL_URL in .env"
            )
        try:
            html = fetch_html(resolved_url)
        except Exception as exc:  # noqa: BLE001 — surface as crawl failure
            raise CrawlError(f"Failed to fetch {resolved_url}: {exc}") from exc

    try:
        rooms = parse_rooms_from_html(html, settings)
    except Exception as exc:  # noqa: BLE001
        raise CrawlError(f"Failed to parse HTML: {exc}") from exc

    if not rooms:
        raise CrawlError(
            "No room listings matched your selectors. "
            "Adjust ROOM_*_SELECTOR settings for the target site."
        )

    saved = room_service.create_crawl_history_bulk(db, rooms)
    return {
        "source_url": resolved_url,
        "parsed_count": len(rooms),
        "inserted_ids": [r.id for r in saved],
    }

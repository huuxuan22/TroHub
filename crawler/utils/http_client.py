"""Thin HTTP fetch wrapper used by the crawler service."""

import httpx

from utils.config import get_settings


def fetch_html(url: str) -> str:
    """Download raw HTML for a URL with timeout and a descriptive User-Agent."""
    settings = get_settings()
    headers = {"User-Agent": settings.http_user_agent}
    with httpx.Client(timeout=settings.http_timeout_seconds, headers=headers) as client:
        response = client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.text

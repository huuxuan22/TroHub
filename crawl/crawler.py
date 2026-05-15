import requests
import time
import random
import logging
from config import HEADERS, DELAY_MIN, DELAY_MAX, MAX_RETRIES, LIST_URL, MAX_PAGES
from parser import parse_listing_page, parse_detail_page

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def fetch(url: str, session: requests.Session) -> str | None:
    """Gửi GET request với retry."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                return resp.text
            elif resp.status_code == 429:
                logger.warning(f"Rate limited (429), chờ 10s...")
                time.sleep(10)
            else:
                logger.warning(f"HTTP {resp.status_code} — {url}")
        except requests.RequestException as e:
            logger.error(f"Lỗi request (lần {attempt}): {e}")
            time.sleep(2 * attempt)
    return None


def _contains_location(text: str, value: str | None) -> bool:
    if not value:
        return True
    return value.strip().lower() in text.lower()


def crawl_all(max_pages: int = MAX_PAGES, list_url: str = LIST_URL, max_items: int | None = None) -> list[dict]:
    """Crawl toàn bộ: danh sách → chi tiết → dữ liệu."""
    session = requests.Session()
    all_data = []
    detail_urls = []

    # Bước 1: Thu thập URL từ các trang danh sách
    for page in range(1, max_pages + 1):
        url = f"{list_url}?page={page}"
        logger.info(f"Crawl trang danh sách: {url}")

        html = fetch(url, session)
        if not html:
            logger.warning(f"Bỏ qua trang {page}")
            continue

        urls = parse_listing_page(html)
        logger.info(f"  → Tìm thấy {len(urls)} bài đăng")
        detail_urls.extend(urls)

        # Delay giữa các trang danh sách
        time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

    detail_urls = list(set(detail_urls))
    logger.info(f"\nTổng cộng {len(detail_urls)} bài đăng duy nhất")

    # Bước 2: Crawl từng trang chi tiết
    for i, url in enumerate(detail_urls, 1):
        if max_items is not None and len(all_data) >= max_items:
            logger.info(f"Đã đạt giới hạn max_items={max_items}, dừng crawl.")
            break

        logger.info(f"[{i}/{len(detail_urls)}] Crawl chi tiết: {url}")

        html = fetch(url, session)
        if not html:
            continue

        data = parse_detail_page(html, url)
        all_data.append(data)
        logger.info(f"  → {data['title'][:50]} | {data['price']} | {data['area']}")

        # Delay giữa các trang chi tiết
        time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

    return all_data


def crawl_by_location(
    xa_phuong: str | None = None,
    tinh_thanh: str | None = None,
    max_pages: int = MAX_PAGES,
    list_url: str = LIST_URL,
    max_items: int | None = None,
) -> list[dict]:
    """
    Crawl dữ liệu rồi lọc theo địa điểm trong trường `address`.
    """
    data = crawl_all(max_pages=max_pages, list_url=list_url, max_items=max_items)
    if not xa_phuong and not tinh_thanh:
        return data

    filtered: list[dict] = []
    for row in data:
        address = str(row.get("address", ""))
        if _contains_location(address, xa_phuong) and _contains_location(address, tinh_thanh):
            filtered.append(row)
    if max_items is not None:
        return filtered[:max_items]
    return filtered
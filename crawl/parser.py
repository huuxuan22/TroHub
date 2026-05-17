from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup
import json
import re


def _make_soup(html: str) -> BeautifulSoup:
    """
    Ưu tiên dùng `lxml` nếu có (nhanh), nhưng fallback về `html.parser`
    để tránh lỗi cài đặt lxml trên một số môi trường Windows.
    """
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        return BeautifulSoup(html, "html.parser")

def parse_listing_page(html: str) -> list[str]:
    """Lấy danh sách URL bài đăng từ trang danh sách."""
    soup = _make_soup(html)
    urls = []

    # Tìm link tin đăng (phongtro123 thường có dạng `...-pr123456.html`)
    # Và đôi khi có dạng `/tinh-thanh/.../.html`
    for a_tag in soup.find_all("a", href=True):
        href = (a_tag.get("href") or "").strip()
        if not href:
            continue

        # Chỉ lấy các link bài đăng chi tiết
        if not (href.endswith(".html") and ("-pr" in href or "/tinh-thanh/" in href)):
            continue

        if href.startswith("/"):
            href = "https://phongtro123.com" + href

        if "phongtro123.com" in href:
            urls.append(href)

    return list(set(urls))  # Loại trùng


def _absolute_image_url(page_url: str, raw: str) -> str:
    raw = (raw or "").strip()
    if not raw or raw.startswith("data:") or raw.startswith("#"):
        return ""
    if raw.startswith("//"):
        return "https:" + raw
    if raw.startswith("http"):
        return raw
    return urljoin(page_url, raw)


def _ensure_https_url(u: str) -> str:
    u = (u or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return "https://" + u.lstrip("/")


def _is_listing_photo_url(u: str) -> bool:
    u = _ensure_https_url(u)
    if not u or not u.startswith("http"):
        return False
    low = u.lower()
    if any(x in low for x in ("default-user", "login-rafiki", "favicon", "logo.svg", "avatar")):
        return False
    if low.endswith((".svg", ".gif")) and "thumbs" not in low:
        return False
    return "pt123.cdn" in low or "static123.com" in low or "/images/thumbs/" in low


def _image_dedupe_key(u: str) -> str:
    m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", u, re.I)
    if m:
        return m.group(1).lower()
    base = u.split("?", 1)[0].rstrip("/")
    return base.split("/")[-1][:120]


def _parse_coordinate(raw: object, *, max_abs: float) -> float | None:
    if raw is None or raw == "":
        return None
    try:
        value = float(str(raw).strip().replace(",", "."))
    except ValueError:
        return None
    if abs(value) > max_abs:
        return None
    return value


def _extract_coordinates(soup: BeautifulSoup, html: str) -> tuple[float | None, float | None]:
    """Lấy lat/lng từ meta, data-*, JSON-LD hoặc script bản đồ trên trang chi tiết."""
    lat: float | None = None
    lng: float | None = None

    for meta in soup.find_all("meta"):
        name = (meta.get("name") or meta.get("property") or "").lower()
        content = (meta.get("content") or "").strip()
        if not content:
            continue
        if name in ("geo.position", "icbm"):
            parts = re.split(r"[;,]\s*", content)
            if len(parts) >= 2:
                lat = _parse_coordinate(parts[0], max_abs=90)
                lng = _parse_coordinate(parts[1], max_abs=180)
                if lat is not None and lng is not None:
                    return lat, lng

    for tag in soup.find_all(attrs={"data-lat": True, "data-lng": True}):
        lat = _parse_coordinate(tag.get("data-lat"), max_abs=90)
        lng = _parse_coordinate(tag.get("data-lng"), max_abs=180)
        if lat is not None and lng is not None:
            return lat, lng
    for tag in soup.find_all(attrs={"data-latitude": True, "data-longitude": True}):
        lat = _parse_coordinate(tag.get("data-latitude"), max_abs=90)
        lng = _parse_coordinate(tag.get("data-longitude"), max_abs=180)
        if lat is not None and lng is not None:
            return lat, lng

    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = (script.string or script.get_text() or "").strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        objs = data if isinstance(data, list) else [data]
        for obj in objs:
            if not isinstance(obj, dict):
                continue
            geo = obj.get("geo")
            if isinstance(geo, dict):
                lat = _parse_coordinate(geo.get("latitude"), max_abs=90)
                lng = _parse_coordinate(geo.get("longitude"), max_abs=180)
                if lat is not None and lng is not None:
                    return lat, lng
            lat = _parse_coordinate(obj.get("latitude"), max_abs=90)
            lng = _parse_coordinate(obj.get("longitude"), max_abs=180)
            if lat is not None and lng is not None:
                return lat, lng

    patterns = [
        r'"lat(?:itude)?"\s*:\s*([+-]?\d+\.?\d*)\s*,\s*"l(?:on|ng)(?:itude)?"\s*:\s*([+-]?\d+\.?\d*)',
        r"lat(?:itude)?\s*[:=]\s*([+-]?\d+\.?\d*)\s*[,;]\s*l(?:on|ng)(?:itude)?\s*[:=]\s*([+-]?\d+\.?\d*)",
        r"center\s*:\s*\[\s*([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)\s*\]",
        r"position\s*:\s*\{\s*lat\s*:\s*([+-]?\d+\.?\d*)\s*,\s*lng\s*:\s*([+-]?\d+\.?\d*)",
    ]
    for pattern in patterns:
        m = re.search(pattern, html, re.I)
        if not m:
            continue
        lat = _parse_coordinate(m.group(1), max_abs=90)
        lng = _parse_coordinate(m.group(2), max_abs=180)
        if lat is not None and lng is not None and 8 <= lat <= 24 and 102 <= lng <= 110:
            return lat, lng

    return None, None


def _pick_better_photo(a: str, b: str) -> str:
    def score(u: str) -> tuple[int, int]:
        return (1 if "900x600" in u else 0, len(u))

    return a if score(a) >= score(b) else b


def _collect_detail_images(soup: BeautifulSoup, page_url: str) -> list[str]:
    """Ảnh tin đăng trên phongtro123 (slider CDN); selector cũ .gallery không còn khớp HTML."""
    candidates: list[str] = []

    for img in soup.select(
        "[class*='slide'] img, .swiper-slide img, .swiper img, "
        ".gallery img, .post-images img, .images img, "
        ".post-detail img, article img, .detail-room img"
    ):
        for attr in ("src", "data-src", "data-lazy-src", "data-original"):
            raw = img.get(attr) or ""
            abs_u = _absolute_image_url(page_url, raw)
            if abs_u and _is_listing_photo_url(abs_u):
                candidates.append(abs_u)

    og = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
    if og and og.get("content"):
        abs_u = _absolute_image_url(page_url, og["content"].strip())
        if abs_u and _is_listing_photo_url(abs_u):
            candidates.append(abs_u)

    # JSON-LD: image / photo
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = (script.string or script.get_text() or "").strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        objs = data if isinstance(data, list) else [data]
        for obj in objs:
            if not isinstance(obj, dict):
                continue
            for key in ("image", "photo", "primaryImageOfPage"):
                val = obj.get(key)
                if isinstance(val, str):
                    urls = [val]
                elif isinstance(val, list):
                    urls = []
                    for it in val:
                        if isinstance(it, str):
                            urls.append(it)
                        elif isinstance(it, dict) and it.get("url"):
                            urls.append(str(it["url"]))
                elif isinstance(val, dict) and val.get("url"):
                    urls = [str(val["url"])]
                else:
                    urls = []
                for u in urls:
                    abs_u = _absolute_image_url(page_url, u)
                    if abs_u and _is_listing_photo_url(abs_u):
                        candidates.append(abs_u)

    best: dict[str, str] = {}
    for u in candidates:
        key = _image_dedupe_key(u)
        if key not in best:
            best[key] = u
        else:
            best[key] = _pick_better_photo(best[key], u)

    ordered = list(dict.fromkeys(best.values()))
    return ordered[:15]


def parse_detail_page(html: str, url: str) -> dict:
    """Trích xuất thông tin chi tiết từ trang bài đăng."""
    soup = _make_soup(html)

    def safe_text(selector, default=""):
        tag = soup.select_one(selector)
        return tag.get_text(strip=True) if tag else default

    def safe_all_text(selector):
        return [t.get_text(strip=True) for t in soup.select(selector)]

    # Lấy giá/diện tích/địa chỉ từ HTML trước, nếu thiếu thì fallback JSON-LD.
    price_raw = safe_text(".price, .gia, span[class*='price']")
    area_raw = safe_text(".area, .dien-tich, span[class*='area']")
    address = safe_text(".address, .dia-chi, span[class*='address']")

    # Lấy số điện thoại (ẩn — cần click "Xem số" trên web, đôi khi có trong data)
    phone = safe_text(".phone, .sdt, a[href^='tel:']")
    if not phone:
        tel_tag = soup.find("a", href=re.compile(r"^tel:"))
        phone = tel_tag["href"].replace("tel:", "") if tel_tag else ""

    # Lấy mô tả
    description = safe_text(".description, .mo-ta, .content-detail")

    images = _collect_detail_images(soup, url)

    # Lấy tiêu đề
    title = safe_text("h1.title, h1.post-title, h1")

    # Ngày đăng
    posted_date = safe_text(".date, .ngay-dang, time")

    # Fallback parse JSON-LD để tăng tỷ lệ có dữ liệu địa chỉ/giá/diện tích.
    if not address or not price_raw or not area_raw:
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            raw = (script.string or script.get_text() or "").strip()
            if not raw:
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            candidates = data if isinstance(data, list) else [data]
            for obj in candidates:
                if not isinstance(obj, dict):
                    continue
                addr = obj.get("address")
                if not address and isinstance(addr, dict):
                    street = addr.get("streetAddress", "")
                    locality = addr.get("addressLocality", "")
                    region = addr.get("addressRegion", "")
                    parts = [x.strip() for x in [street, locality, region] if str(x).strip()]
                    if parts:
                        address = ", ".join(parts)
                if not price_raw:
                    price_raw = str(obj.get("price") or obj.get("priceRange") or "").strip()
                if not area_raw:
                    floor = obj.get("floorSize")
                    if isinstance(floor, dict):
                        area_raw = str(floor.get("value") or "").strip()
                    elif floor:
                        area_raw = str(floor).strip()
                if address and price_raw and area_raw:
                    break
            if address and price_raw and area_raw:
                break

    latitude, longitude = _extract_coordinates(soup, html)

    return {
        "url": url,
        "title": title,
        "price": price_raw,
        "area": area_raw,
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "phone": phone,
        "description": description[:500],  # Giới hạn độ dài
        # JSON array trong DB — tránh nối "|" khiến browser coi cả chuỗi là một URL (404).
        "images": json.dumps([_ensure_https_url(u) for u in images], ensure_ascii=False) if images else "",
        "posted_date": posted_date,
    }
"""Application settings loaded from environment variables (.env)."""

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field, HttpUrl

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration; override via .env for local and deployed environments."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        ...,
        description="SQLAlchemy URL, e.g. mysql+pymysql://user:pass@localhost:3306/trohub?charset=utf8mb4",
    )

    http_timeout_seconds: float = 15.0
    http_user_agent: str = (
        "TroHubCrawler/1.0 (+https://github.com/) compatible research bot"
    )

    # Optional target used when POST /crawl body omits `url`
    default_crawl_url: HttpUrl | None = None

    # CSS selectors for BeautifulSoup (page-specific; tune per site you crawl)
    room_item_selector: str = ".room-item"
    room_title_selector: str = ".title"
    room_price_selector: str = ".price"
    room_location_selector: str = ".location"
    room_image_selector: str = "img"
    room_description_selector: str = ".description"
    room_phone_selector: str = ".phone"


@lru_cache
def get_settings() -> Settings:
    return Settings()

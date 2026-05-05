"""
Alembic environment for autogenerate and migrations.

Execution order matters:
1. ``sys.path`` — so ``database``, ``models``, ``utils`` resolve when Alembic loads this file.
2. ``load_dotenv`` — Alembic does not load ``.env`` by itself; ``os.environ`` must be populated before ``DATABASE_URL`` is read.
3. ``import models`` — registers every ORM class on ``Base.metadata``. Without this, ``target_metadata`` has **no tables**, and ``--autogenerate`` yields an empty migration (or wrong diff).
4. ``config.set_main_option("sqlalchemy.url", ...)`` — overrides the placeholder in ``alembic.ini``.
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# Directory containing alembic.ini (project root for this service: crawler/)
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load env files: explicit path works even when CWD is not crawler/
load_dotenv(ROOT / ".env")
load_dotenv()

from database.base import Base  # noqa: E402

# Side effect: imports every model module so all Table objects attach to Base.metadata
import models  # noqa: E402, F401

target_metadata = Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def get_database_url() -> str:
    """Resolve DB URL: prefer DATABASE_URL, then Pydantic Settings (also reads .env)."""
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if url:
        return url
    try:
        from utils.config import get_settings

        get_settings.cache_clear()
        return get_settings().database_url.strip()
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "Cannot resolve database URL. Set DATABASE_URL in crawler/.env "
            "(or export it). Example: mysql+pymysql://user:pass@127.0.0.1:3306/db?charset=utf8mb4"
        ) from exc


config.set_main_option("sqlalchemy.url", get_database_url())


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

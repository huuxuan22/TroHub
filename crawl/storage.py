"""
Tiện ích xuất JSON/CSV ra thư mục `data/` (tùy chọn, offline).
Service FastAPI trong `main.py` **không** gọi module này — dữ liệu crawl lưu qua MySQL (`craw_data`).
"""
import json
import csv
import os
import pandas as pd
from datetime import datetime
from config import OUTPUT_DIR

os.makedirs(OUTPUT_DIR, exist_ok=True)


def save_json(data: list[dict], filename: str = None) -> str:
    if not filename:
        filename = f"phongtro_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Đã lưu JSON: {path} ({len(data)} bài)")
    return path


def save_csv(data: list[dict], filename: str = None) -> str:
    if not filename:
        filename = f"phongtro_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    path = os.path.join(OUTPUT_DIR, filename)
    df = pd.DataFrame(data)
    df.to_csv(path, index=False, encoding="utf-8-sig")  # utf-8-sig cho Excel
    print(f"Đã lưu CSV: {path} ({len(data)} bài)")
    return path
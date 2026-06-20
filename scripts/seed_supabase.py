"""
Seeds Supabase with problems from data/problems_ai.json (or problems.json).
Run this after OCR and analysis scripts.

Usage:
    pip install supabase python-dotenv
    python scripts/seed_supabase.py
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"


def seed_variants():
    with open(DATA_DIR / "pdf_urls.json", encoding="utf-8") as f:
        pdf_urls = json.load(f)

    stream_dates = {
        (2025, 1): "11 июля 2025", (2025, 2): "12 июля 2025", (2025, 3): "15 июля 2025",
        (2025, 4): "18 июля 2025", (2025, 5): "19 июля 2025", (2025, 6): "20 июля 2025",
        (2024, 1): "11 июля 2024", (2024, 2): "12 июля 2024", (2024, 3): "15 июля 2024",
        (2024, 4): "18 июля 2024", (2024, 5): "20 июля 2024", (2024, 6): "21 июля 2024",
        (2023, 1): "11 июля 2023", (2023, 2): "12 июля 2023", (2023, 3): "15 июля 2023",
        (2023, 4): "18 июля 2023", (2023, 5): "20 июля 2023", (2023, 6): "21 июля 2023",
        (2022, 1): "11 июля 2022", (2022, 2): "14 июля 2022", (2022, 3): "15 июля 2022",
        (2022, 4): "19 июля 2022", (2022, 5): "20 июля 2022", (2022, 6): "22 июля 2022",
        (2021, 1): "17 июля 2021", (2021, 2): "18 июля 2021", (2021, 3): "19 июля 2021",
        (2021, 4): "21 июля 2021", (2021, 5): "23 июля 2021", (2021, 6): "25 июля 2021",
        (2020, 1): "Вариант 1", (2020, 2): "Вариант 2", (2020, 3): "Вариант 3",
        (2020, 4): "Вариант 4", (2020, 5): "Вариант 5", (2020, 6): "Вариант 6",
    }

    rows = []
    for year_str, urls in pdf_urls.items():
        year = int(year_str)
        for i, url in enumerate(urls, start=1):
            rows.append({
                "year": year,
                "variant_num": i,
                "stream_date": stream_dates.get((year, i), f"Вариант {i}"),
                "source_url": url,
            })

    resp = supabase.table("variants").upsert(rows, on_conflict="year,variant_num").execute()
    print(f"Seeded {len(rows)} variants")
    return {(r["year"], r["variant_num"]): r["id"] for r in supabase.table("variants").select("id,year,variant_num").execute().data}


def seed_problems(variant_ids: dict):
    problems_path = DATA_DIR / "problems_ai.json"
    if not problems_path.exists():
        problems_path = DATA_DIR / "problems.json"
    if not problems_path.exists():
        print("No problems file found. Run analyze scripts first.")
        return

    with open(problems_path, encoding="utf-8") as f:
        problems = json.load(f)

    rows = []
    for p in problems:
        vid = variant_ids.get((p["year"], p["variant_num"]))
        if not vid:
            continue
        rows.append({
            "variant_id": vid,
            "year": p["year"],
            "variant_num": p["variant_num"],
            "problem_num": p["problem_num"],
            "problem_type": p["problem_type"],
            "topic_label": p.get("topic_label", ""),
            "ocr_text": p.get("ocr_text", "")[:500],
            "ocr_markdown": p.get("ocr_markdown", ""),
        })

    # Batch insert (100 at a time)
    for i in range(0, len(rows), 100):
        batch = rows[i:i+100]
        supabase.table("problems").upsert(batch, on_conflict="variant_id,problem_num").execute()
        print(f"  Inserted problems {i+1}–{min(i+100, len(rows))}")

    print(f"Seeded {len(rows)} problems total")

    # Create empty progress rows for all problems
    problem_ids = [r["id"] for r in supabase.table("problems").select("id").execute().data]
    progress_rows = [{"problem_id": pid} for pid in problem_ids]
    for i in range(0, len(progress_rows), 100):
        supabase.table("progress").upsert(progress_rows[i:i+100], on_conflict="problem_id").execute()
    print(f"Created {len(progress_rows)} progress rows")


if __name__ == "__main__":
    print("Seeding variants...")
    variant_ids = seed_variants()
    print("Seeding problems...")
    seed_problems(variant_ids)
    print("Done!")

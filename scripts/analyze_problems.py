"""
Analyzes OCR markdown output to categorize DVI math problems by type.
Uploads structured data to Supabase.

DVI MGU structure: 8 problems per variant.
Each problem is separated by numbered headings (Задача 1, Задача 2, etc.)

Usage:
    pip install supabase python-dotenv
    python scripts/analyze_problems.py
"""

import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None
except ImportError:
    supabase = None
    print("Warning: supabase not installed. Install with: pip install supabase")

BASE_DIR = Path(__file__).parent.parent
OCR_DIR = BASE_DIR / "ocr_output"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Keyword patterns for auto-classification (Russian math terms)
TYPE_PATTERNS = {
    "algebra": [
        r"уравнени", r"корн\b", r"многочлен", r"квадратн", r"степен",
        r"систем\b", r"логарифм", r"показатель", r"показательн",
    ],
    "inequalities": [
        r"неравенств", r"больше\b", r"меньше\b", r"не превышает", r"не менее",
    ],
    "functions": [
        r"функци", r"график", r"область.*определени", r"область.*значений",
        r"возрастает", r"убывает", r"экстремум", r"производн",
    ],
    "trigonometry": [
        r"sin\b", r"cos\b", r"tg\b", r"ctg\b", r"arcsin", r"arccos",
        r"тригонометр", r"синус", r"косинус", r"тангенс",
    ],
    "planimetry": [
        r"треугольник", r"четырёхугольник", r"прямоугольник", r"ромб",
        r"окружност", r"хорда", r"касательн", r"площадь.*фигур",
        r"трапеци", r"параллелограмм", r"периметр", r"угол.*треугольник",
    ],
    "stereometry": [
        r"призм", r"пирамид", r"цилиндр", r"конус", r"шар", r"сфер",
        r"параллелепипед", r"куб\b", r"тетраэдр", r"объём", r"поверхность.*тел",
    ],
    "combinatorics": [
        r"вероятност", r"комбинаторик", r"перестановк", r"сочетани",
        r"размещени", r"случайн", r"испытани", r"событи",
    ],
    "sequences": [
        r"последовательност", r"прогресси", r"геометрическ.*прогресси",
        r"арифметическ.*прогресси", r"сумма.*членов", r"n-й член",
    ],
    "word_problems": [
        r"скорост", r"расстояни", r"время\b", r"работ", r"производительност",
        r"концентраци", r"смес", r"цен[аы]\b", r"прибыл", r"процент",
        r"задач[аи]\b.*условн", r"из точки", r"движени",
    ],
}


def classify_problem(text: str) -> str:
    text_lower = text.lower()
    scores = {}
    for ptype, patterns in TYPE_PATTERNS.items():
        score = sum(1 for p in patterns if re.search(p, text_lower))
        if score > 0:
            scores[ptype] = score
    if not scores:
        return "unknown"
    return max(scores, key=scores.get)


def split_problems(markdown: str) -> list[str]:
    """Split variant markdown into 8 individual problems."""
    # Try numbered task headers
    patterns = [
        r"(?=#{1,3}\s*[Зз]адача\s*\d+)",
        r"(?=\*\*[Зз]адача\s*\d+\*\*)",
        r"(?=^[Зз]адача\s*\d+\.?\s*$)",
        r"(?=\n\s*\d+[.)]\s+[А-ЯA-Z])",
    ]
    for pattern in patterns:
        parts = re.split(pattern, markdown, flags=re.MULTILINE)
        parts = [p.strip() for p in parts if p.strip()]
        if 6 <= len(parts) <= 10:
            return parts[:8]

    # Fallback: split by page separators and take first 8
    pages = [p.strip() for p in markdown.split("---") if p.strip()]
    if len(pages) >= 8:
        return pages[:8]

    # Last resort: equal chunks
    chunk_size = max(len(markdown) // 8, 100)
    return [markdown[i:i+chunk_size] for i in range(0, min(len(markdown), chunk_size * 8), chunk_size)]


def process_variant(year: int, variant_num: int) -> list[dict]:
    md_path = OCR_DIR / str(year) / f"variant_{variant_num}.md"
    if not md_path.exists():
        print(f"  Missing OCR output: {md_path}")
        return []

    markdown = md_path.read_text(encoding="utf-8")
    problem_texts = split_problems(markdown)

    problems = []
    for i, text in enumerate(problem_texts, start=1):
        ptype = classify_problem(text)
        problems.append({
            "year": year,
            "variant_num": variant_num,
            "problem_num": i,
            "problem_type": ptype,
            "topic_label": TOPIC_LABELS.get(ptype, "Другое"),
            "ocr_text": text[:500],
            "ocr_markdown": text,
        })
    return problems


TOPIC_LABELS = {
    "algebra": "Алгебра",
    "inequalities": "Неравенства",
    "functions": "Функции и графики",
    "trigonometry": "Тригонометрия",
    "planimetry": "Планиметрия",
    "stereometry": "Стереометрия",
    "combinatorics": "Комбинаторика и вероятность",
    "sequences": "Последовательности и прогрессии",
    "word_problems": "Текстовые задачи",
    "unknown": "Другое",
}


def upload_to_supabase(problems: list[dict]):
    if not supabase:
        print("Supabase not configured, skipping upload.")
        return
    for p in problems:
        variant_resp = supabase.table("variants").select("id").eq("year", p["year"]).eq("variant_num", p["variant_num"]).single().execute()
        if not variant_resp.data:
            print(f"  Variant {p['year']}/{p['variant_num']} not in DB, skipping.")
            continue
        variant_id = variant_resp.data["id"]
        row = {**p, "variant_id": variant_id}
        supabase.table("problems").upsert(row, on_conflict="variant_id,problem_num").execute()
    print(f"  Uploaded {len(problems)} problems to Supabase.")


def main():
    all_problems = []

    with open(BASE_DIR / "data" / "pdf_urls.json", encoding="utf-8") as f:
        pdf_urls = json.load(f)

    for year_str in sorted(pdf_urls.keys()):
        year = int(year_str)
        variants = len(pdf_urls[year_str])
        for v in range(1, variants + 1):
            print(f"Analyzing {year} V{v}...")
            problems = process_variant(year, v)
            if problems:
                all_problems.extend(problems)
                print(f"  Found {len(problems)} problems")

    # Save locally
    out_path = DATA_DIR / "problems.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_problems, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(all_problems)} problems to {out_path}")

    # Upload to Supabase
    if supabase:
        print("\nUploading to Supabase...")
        upload_to_supabase(all_problems)

    # Print type summary
    from collections import Counter
    type_counts = Counter(p["problem_type"] for p in all_problems)
    print("\nProblem types found:")
    for t, count in type_counts.most_common():
        print(f"  {TOPIC_LABELS.get(t, t)}: {count}")


if __name__ == "__main__":
    main()

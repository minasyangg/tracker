"""
AI-powered problem classification using DeepSeek.
Reads OCR markdown, sends each problem to DeepSeek API for classification.
Much more accurate than keyword matching for math problems.

Usage:
    pip install requests python-dotenv
    python scripts/analyze_with_ai.py
"""

import json
import os
import re
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

BASE_DIR = Path(__file__).parent.parent
OCR_DIR = BASE_DIR / "ocr_output"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

PROBLEM_TYPES = {
    "algebra": "Алгебра (уравнения, системы, многочлены, логарифмы, показательные)",
    "inequalities": "Неравенства (алгебраические, логарифмические, показательные, тригонометрические)",
    "functions": "Функции и графики (исследование функции, область определения, производная)",
    "trigonometry": "Тригонометрия (уравнения, тождества, sin/cos/tg/ctg)",
    "planimetry": "Планиметрия (треугольники, окружности, четырёхугольники, площади)",
    "stereometry": "Стереометрия (тела вращения, многогранники, объёмы, сечения)",
    "combinatorics": "Комбинаторика и теория вероятностей (перестановки, сочетания, вероятность)",
    "sequences": "Последовательности и прогрессии (арифметическая, геометрическая)",
    "word_problems": "Текстовые задачи (движение, работа, смеси, проценты, концентрации)",
}

CLASSIFY_PROMPT = """Ты помощник по классификации задач из экзамена ДВИ МГУ по математике.

Определи тип задачи из следующих категорий:
{categories}

Текст задачи:
{problem_text}

Ответь ТОЛЬКО одним словом — ключом категории из списка:
algebra, inequalities, functions, trigonometry, planimetry, stereometry, combinatorics, sequences, word_problems

Если не уверен — выбери наиболее подходящее."""


def classify_with_deepseek(problem_text: str) -> str:
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY not set in .env")

    categories = "\n".join(f"- {k}: {v}" for k, v in PROBLEM_TYPES.items())
    prompt = CLASSIFY_PROMPT.format(
        categories=categories,
        problem_text=problem_text[:1500],
    )

    resp = requests.post(
        DEEPSEEK_URL,
        headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 20,
            "temperature": 0,
        },
        timeout=30,
    )
    resp.raise_for_status()
    answer = resp.json()["choices"][0]["message"]["content"].strip().lower()

    # Extract first valid key
    for key in PROBLEM_TYPES:
        if key in answer:
            return key
    return "unknown"


def split_problems(markdown: str) -> list[str]:
    patterns = [
        r"(?=#{1,3}\s*[Зз]адача\s*\d+)",
        r"(?=\*\*[Зз]адача\s*\d+\*\*)",
        r"(?=^[Зз]адача\s*\d+\.?\s*$)",
    ]
    for pattern in patterns:
        parts = re.split(pattern, markdown, flags=re.MULTILINE)
        parts = [p.strip() for p in parts if p.strip()]
        if 6 <= len(parts) <= 10:
            return parts[:8]

    pages = [p.strip() for p in markdown.split("---") if p.strip()]
    if len(pages) >= 8:
        return pages[:8]

    chunk = max(len(markdown) // 8, 100)
    return [markdown[i:i+chunk] for i in range(0, min(len(markdown), chunk * 8), chunk)]


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


def process_all():
    with open(BASE_DIR / "data" / "pdf_urls.json", encoding="utf-8") as f:
        pdf_urls = json.load(f)

    all_problems = []
    cache_path = DATA_DIR / "problems_ai.json"

    # Load existing cache
    if cache_path.exists():
        with open(cache_path, encoding="utf-8") as f:
            all_problems = json.load(f)
        existing_keys = {(p["year"], p["variant_num"], p["problem_num"]) for p in all_problems}
    else:
        existing_keys = set()

    for year_str in sorted(pdf_urls.keys()):
        year = int(year_str)
        for v in range(1, len(pdf_urls[year_str]) + 1):
            md_path = OCR_DIR / year_str / f"variant_{v}.md"
            if not md_path.exists():
                print(f"  [{year} V{v}] No OCR output yet, skipping.")
                continue

            markdown = md_path.read_text(encoding="utf-8")
            problem_texts = split_problems(markdown)

            for i, text in enumerate(problem_texts, start=1):
                if (year, v, i) in existing_keys:
                    continue

                print(f"  [{year} V{v} P{i}] Classifying...")
                try:
                    ptype = classify_with_deepseek(text)
                    time.sleep(0.5)  # rate limit
                except Exception as e:
                    print(f"    Error: {e}")
                    ptype = "unknown"

                problem = {
                    "year": year,
                    "variant_num": v,
                    "problem_num": i,
                    "problem_type": ptype,
                    "topic_label": TOPIC_LABELS.get(ptype, "Другое"),
                    "ocr_text": text[:500],
                    "ocr_markdown": text,
                }
                all_problems.append(problem)
                existing_keys.add((year, v, i))

                # Save after each problem
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(all_problems, f, ensure_ascii=False, indent=2)

    print(f"\nTotal problems analyzed: {len(all_problems)}")

    # Summary
    from collections import Counter
    counts = Counter(p["problem_type"] for p in all_problems)
    for t, c in counts.most_common():
        print(f"  {TOPIC_LABELS.get(t, t)}: {c}")

    return all_problems


if __name__ == "__main__":
    process_all()

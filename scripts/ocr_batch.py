"""
Batch OCR processing of MSU DVI math PDFs via PaddleOCR API.
Reads URLs from data/pdf_urls.json, submits each PDF, saves results to ocr_output/.

Usage:
    pip install requests python-dotenv
    python scripts/ocr_batch.py
"""

import json
import os
import sys
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
TOKEN = os.getenv("PADDLEOCR_TOKEN", "45fd5715c0389738924cc15685d437bf22c7dcd9")
MODEL = "PaddleOCR-VL-1.6"

BASE_DIR = Path(__file__).parent.parent
URLS_FILE = BASE_DIR / "data" / "pdf_urls.json"
OUTPUT_DIR = BASE_DIR / "ocr_output"
OUTPUT_DIR.mkdir(exist_ok=True)

OPTIONAL_PAYLOAD = {
    "markdownIgnoreLabels": ["header", "header_image", "footer", "footer_image", "number", "footnote"],
    "useDocOrientationClassify": False,
    "useDocUnwarping": False,
    "useLayoutDetection": True,
    "useChartRecognition": False,
    "useSealRecognition": False,
    "useOcrForImageBlock": True,
    "mergeTables": True,
    "relevelTitles": True,
    "layoutShapeMode": "auto",
    "promptLabel": "ocr",
    "repetitionPenalty": 1,
    "temperature": 0,
    "topP": 1,
    "minPixels": 147384,
    "maxPixels": 2822400,
    "layoutNms": True,
    "restructurePages": True,
}


def submit_ocr_job(file_url: str) -> str:
    headers = {
        "Authorization": f"bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"fileUrl": file_url, "model": MODEL, "optionalPayload": OPTIONAL_PAYLOAD}
    resp = requests.post(JOB_URL, json=payload, headers=headers, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Submit failed {resp.status_code}: {resp.text}")
    return resp.json()["data"]["jobId"]


def poll_job(job_id: str, timeout_seconds: int = 300) -> str:
    headers = {"Authorization": f"bearer {TOKEN}"}
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        resp = requests.get(f"{JOB_URL}/{job_id}", headers=headers, timeout=30)
        data = resp.json()["data"]
        state = data["state"]
        if state == "done":
            return data["resultUrl"]["jsonUrl"]
        elif state == "failed":
            raise RuntimeError(f"OCR job failed: {data.get('errorMsg')}")
        elif state == "running":
            progress = data.get("extractProgress", {})
            print(f"  Running: {progress.get('extractedPages', 0)}/{progress.get('totalPages', '?')} pages")
        time.sleep(5)
    raise TimeoutError(f"Job {job_id} did not complete in {timeout_seconds}s")


def download_result(jsonl_url: str, year: int, variant_num: int):
    out_dir = OUTPUT_DIR / str(year)
    out_dir.mkdir(exist_ok=True)
    prefix = f"variant_{variant_num}"

    resp = requests.get(jsonl_url, timeout=60)
    resp.raise_for_status()

    raw_path = out_dir / f"{prefix}_raw.jsonl"
    raw_path.write_text(resp.text, encoding="utf-8")

    lines = [l.strip() for l in resp.text.strip().split("\n") if l.strip()]
    pages = []
    for line in lines:
        result = json.loads(line)["result"]
        for layout_result in result["layoutParsingResults"]:
            md_text = layout_result["markdown"]["text"]
            pages.append(md_text)

            for img_path, img_url in layout_result["markdown"].get("images", {}).items():
                full_path = out_dir / img_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                img_resp = requests.get(img_url, timeout=30)
                full_path.write_bytes(img_resp.content)

    combined_md = "\n\n---\n\n".join(pages)
    md_path = out_dir / f"{prefix}.md"
    md_path.write_text(combined_md, encoding="utf-8")
    print(f"  Saved: {md_path} ({len(pages)} pages)")
    return md_path


def already_processed(year: int, variant_num: int) -> bool:
    return (OUTPUT_DIR / str(year) / f"variant_{variant_num}.md").exists()


def main():
    with open(URLS_FILE, encoding="utf-8") as f:
        all_urls = json.load(f)

    years = sorted(all_urls.keys(), reverse=True)
    for year in years:
        urls = all_urls[year]
        for i, url in enumerate(urls, start=1):
            variant_num = i
            if already_processed(int(year), variant_num):
                print(f"[{year} V{variant_num}] Already processed, skipping.")
                continue

            print(f"\n[{year} V{variant_num}] Submitting: {url}")
            try:
                job_id = submit_ocr_job(url)
                print(f"  Job ID: {job_id}")
                jsonl_url = poll_job(job_id)
                download_result(jsonl_url, int(year), variant_num)
            except Exception as e:
                print(f"  ERROR: {e}")
                continue

    print("\nDone! All variants processed.")


if __name__ == "__main__":
    main()

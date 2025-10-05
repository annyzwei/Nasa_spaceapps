import argparse
import os
import shutil
import json
from typing import Dict

# local modules
import downloader
import extract_text
import ai_prompt
import ai_test


RAW_DIR = "raw"
TEXT_DIR = "text"
DEFAULT_TEXT_JSON = os.path.join(TEXT_DIR, "temparticle.json")


ALIAS_MAP = {
    "results and discussion": "results",
    "results & discussion": "results",
    "results/discussion": "results",
    "discussion and results": "discussion",
    "conclusions": "conclusion",
    "intro": "introduction",
}


def normalize_sections(sections: Dict[str, str]) -> Dict[str, str]:
    out = {}
    for k, v in sections.items():
        if not isinstance(k, str):
            continue
        key = k.strip().lower()
        key = ALIAS_MAP.get(key, key)
        out[key] = v
    return out


def copy_input_to_raw(input_path: str) -> str:
    os.makedirs(RAW_DIR, exist_ok=True)
    base = os.path.basename(input_path)
    dest = os.path.join(RAW_DIR, base)
    shutil.copyfile(input_path, dest)
    return dest


def run_extraction():
    # extract_text.main writes TEXT_DIR/temparticle.json
    extract_text.main()


def move_downloaded_to_raw():
    """Downloader writes to ../data/raw; move any .html files into local raw/ for extraction."""
    src_dir = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
    src_dir = os.path.normpath(src_dir)
    dst_dir = os.path.join(os.path.dirname(__file__), RAW_DIR)
    os.makedirs(dst_dir, exist_ok=True)
    if not os.path.isdir(src_dir):
        return
    for fname in os.listdir(src_dir):
        if not fname.lower().endswith('.html'):
            continue
        src = os.path.join(src_dir, fname)
        dst = os.path.join(dst_dir, fname)
        try:
            shutil.copyfile(src, dst)
        except Exception:
            pass


def load_sections(json_path: str = DEFAULT_TEXT_JSON) -> Dict[str, str]:
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Expected extracted JSON at {json_path} (run extract_text first)")
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    return data


def call_model_and_parse(prompt: str, temperature: float) -> Dict:
    raw = ai_test._call_with_fallback(prompt, temperature=temperature)
    parsed = ai_test._parse_json(raw)
    return parsed


def main():
    ap = argparse.ArgumentParser(description="Orchestrate downloader -> extractor -> prompt builder -> optional LLM call")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", help="Path to a local HTML file to process (will be copied to raw/)")
    group.add_argument("--download", help="Comma-separated keywords to pass to downloader (fetches matching papers)")
    ap.add_argument("--prompt-only", action="store_true", help="Only build and print the prompt, do not call the LLM")
    ap.add_argument("--output", default="summary.json", help="Output JSON path for parsed model output (default: summary.json)")
    ap.add_argument("--temperature", type=float, default=0.0, help="Temperature for the LLM call (default: 0.0)")

    args = ap.parse_args()

    # Step 1: download or copy file into raw/
    if args.download:
        keywords = [k.strip() for k in args.download.split(",") if k.strip()]
        print(f"Running downloader for keywords: {keywords}")
        downloader.main(keywords)
        move_downloaded_to_raw()
    else:
        print(f"Copying {args.file} into {RAW_DIR}/ and running extraction")
        copy_input_to_raw(args.file)

    # Step 2: run extraction (writes text/temparticle.json)
    print("Running text extraction...")
    run_extraction()

    # Step 3: load JSON produced by extraction
    print(f"Loading extracted JSON from {DEFAULT_TEXT_JSON}...")
    sections = load_sections()
    if not sections:
        print("No sections found in extracted JSON. Exiting.")
        return

    # Normalize keys (simple mapping)
    sections_norm = normalize_sections(sections)

    # Step 4: build prompt
    prompt = ai_prompt.build_prompt_from_sections(sections_norm)
    print("\n===== PROMPT =====\n")
    print(prompt)

    # If prompt-only, exit after printing
    if args.prompt_only:
        print("\n(prompt-only mode; exiting)")
        return

    # Step 5: call LLM and parse JSON
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not set. Put it in .env or your shell environment.")

    print(f"Calling LLM (temperature={args.temperature})...")
    parsed = call_model_and_parse(prompt, temperature=args.temperature)

    # Save result
    outpath = args.output
    with open(outpath, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)
    print(f"Saved parsed JSON to {outpath}")


if __name__ == "__main__":
    main()

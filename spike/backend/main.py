import os
import argparse
import json
import downloader
import extract_text
import ai_prompt

RAW_DIR = "raw"
TEXT_DIR = "extracted_text"
EXTRACTED_JSON = os.path.join(TEXT_DIR, "extracted_temparticle.json")
SUMMARY_JSON = os.path.join("summary.json")


def run_download(article_name: str):
    """Download a single article into raw/raw_temparticle.html"""
    os.makedirs(RAW_DIR, exist_ok=True)
    downloader.download_article_by_title(article_name)


def run_extraction():
    """Run extraction on raw/raw_temparticle.html, outputs extracted_text/extracted_temparticle.json"""
    os.makedirs(TEXT_DIR, exist_ok=True)
    extract_text.main()


def build_summary():
    """Load extracted JSON, build prompt, call OpenAI, and save summary JSON."""
    if not os.path.exists(EXTRACTED_JSON):
        raise FileNotFoundError(f"Expected extracted JSON at {EXTRACTED_JSON}")

    with open(EXTRACTED_JSON, "r", encoding="utf-8") as f:
        sections = json.load(f)

    # Build prompt using sections
    prompt = ai_prompt.build_prompt_from_sections(sections)

    # Call OpenAI API to get summary
    response = ai_prompt.openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    # Parse text output
    summary_text = response.choices[0].message.content

    # Save raw text JSON (you could optionally parse into dict here)
    with open(SUMMARY_JSON, "w", encoding="utf-8") as f:
        f.write(summary_text)

    print(f"Saved summary JSON to {SUMMARY_JSON}")


def main(article_name: str):
    print(f"Downloading article: {article_name}")
    run_download(article_name)

    print("Running text extraction...")
    run_extraction()

    print("Building summary...")
    build_summary()

    print("All steps complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download, extract, and summarize a single article.")
    parser.add_argument("--article", type=str, required=True, help="Exact title of the article to download")
    args = parser.parse_args()

    main(args.article)

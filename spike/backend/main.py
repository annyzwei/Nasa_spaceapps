import os
import argparse
import downloader
import extract_text

RAW_DIR = "raw"
TEXT_DIR = "extracted_text"

def run_download(article_name: str):
    """Download a single article into raw/raw_temparticle.html"""
    os.makedirs(RAW_DIR, exist_ok=True)
    downloader.download_article_by_title(article_name)

def run_extraction():
    """Run extraction on raw/raw_temparticle.html, outputs extracted_text/extracted_temparticle.json"""
    os.makedirs(TEXT_DIR, exist_ok=True)
    extract_text.main()  # assumes extract_text.main() reads raw/raw_temparticle.html

def main(article_name: str):
    print(f"Downloading article: {article_name}")
    run_download(article_name)

    print("Running text extraction...")
    run_extraction()

    print("Extraction complete. Check extracted_text/extracted_temparticle.json")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download and extract a single article.")
    parser.add_argument("--article", type=str, required=True, help="Exact title of the article to download")
    args = parser.parse_args()

    main(args.article)
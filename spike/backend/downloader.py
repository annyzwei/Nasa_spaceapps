import json, os, re, time, requests

RAW_DIRECTORY = "raw"
os.makedirs(RAW_DIRECTORY, exist_ok=True)

def fetch_page(url):
    """Download page HTML with headers and timeout."""
    headers = {"User-Agent": "SpikeResearchBot/1.0"}
    r = requests.get(url, headers=headers, timeout=(5, 10))
    r.raise_for_status()
    return r.text

def download_article_by_title(article_title, json_path="data/SB_Publication_PMC.json"):
    """Download a single article by exact title."""
    with open(json_path, "r", encoding="utf-8") as f:
        papers = json.load(f)

    # Look for exact match (case-insensitive)
    matched = next((p for p in papers if p["Title"].strip().lower() == article_title.lower()), None)

    if not matched:
        print(f"No article found with title: {article_title}")
        return

    fname = "raw_temparticle.html"
    path = os.path.join(RAW_DIRECTORY, fname)

    try:
        html = fetch_page(matched["Link"])
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Saved {matched['Title']}")
        time.sleep(1)  # polite pause
    except Exception as e:
        print(f"Error downloading {matched['Title']}: {e}")

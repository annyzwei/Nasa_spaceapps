import json, os, re, time, requests

RAW_DIRECTORY = "data/raw"
os.makedirs(RAW_DIRECTORY, exist_ok=True)

def safe_filename(title):
    return re.sub(r"[^\w\s-]", "", title).strip().replace(" ", "_")[:80]

def fetch_page(url):
    headers = {"User-Agent": "SpikeResearchBot/1.0"}  # identify your bot
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return r.text

def main():
    with open("data/SB_Publication_PMC.json", "r") as f:
        papers = json.load(f)

    for paper in papers:
        fname = safe_filename(paper["Title"]) + ".html"
        path = os.path.join(RAW_DIRECTORY, fname)

        if os.path.exists(path):
            print(f"Already downloaded: {paper['Title']}")
            continue

        try:
            html = fetch_page(paper["Link"])
            with open(path, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"Saved {paper['Title']}")
            time.sleep(1)  # polite pause
        except Exception as e:
            print(f"Error fetching {paper['Title']}: {e}")

if __name__ == "__main__":
    main()
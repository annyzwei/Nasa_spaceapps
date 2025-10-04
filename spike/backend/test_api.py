
#!/usr/bin/env python3
"""
Smoke test for app.py API endpoints (no pytest, no Flask test client).

This version SAVES the downloaded JSON to disk.

Usage:
  # Ensure your server is running:  python app.py
  # Then run:
  python smoke_test_api.py
  # Or customize:
  API_BASE_URL=http://localhost:5000 API_TIMEOUT=15 API_DOWNLOAD_DIR=downloads python smoke_test_api.py
"""
import os
import sys
import json
import time
import argparse
from typing import Optional

try:
    import requests
except ImportError:
    print("Please install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")
TIMEOUT = int(os.getenv("API_TIMEOUT", "20"))
DOWNLOAD_DIR = os.getenv("API_DOWNLOAD_DIR", "downloads")

SAMPLE_SECTIONS = {
    "results and discussion": "Plants grew ~30% slower in microgravity...",
    "general outcomes": "Telemetry viable; enrichment reduced stress...",
    "conclusions": "Space habitats need tailored life-support cycles."
}

def req(method: str, path: str, **kwargs) -> requests.Response:
    url = BASE_URL.rstrip("/") + path
    r = requests.request(method, url, timeout=TIMEOUT, **kwargs)
    return r

def test_hello() -> None:
    print("→ GET /api/hello")
    r = req("GET", "/api/hello")
    print("  status:", r.status_code)
    r.raise_for_status()
    data = r.json()
    print("  json:", data)
    assert data.get("msg") == "Hello from backend"

def test_build_prompt(sections: dict) -> str:
    print("→ POST /api/build_prompt")
    r = req("POST", "/api/build_prompt", json={"sections": sections})
    print("  status:", r.status_code)
    r.raise_for_status()
    data = r.json()
    prompt = data.get("prompt", "")
    print("  prompt preview:", (prompt[:160] + "…") if len(prompt) > 160 else prompt)
    assert isinstance(prompt, str) and len(prompt) > 0
    # Sanity: ensure user text made it into the prompt
    assert "Plants grew ~30% slower" in prompt
    return prompt

def test_summarize(sections: dict, allow_503: bool = True) -> Optional[str]:
    """
    Returns saved filename if summarize succeeds, else None.
    If OPENAI_API_KEY is not set on the server, /api/summarize may return 503.
    """
    print("→ POST /api/summarize")
    r = req("POST", "/api/summarize", json={"sections": sections})
    print("  status:", r.status_code)
    if r.status_code == 503 and allow_503:
        print("  (OPENAI_API_KEY not configured on server; skipping summarize test)")
        return None
    r.raise_for_status()
    data = r.json()
    print("  message:", data.get("message"))
    print("  file:", data.get("file"))
    print("  json keys:", list((data.get("json") or {}).keys()))
    assert data.get("json") and isinstance(data["json"], dict)
    return data.get("file")

def _filename_from_cd(cd_header: str) -> Optional[str]:
    # Parse Content-Disposition header for filename
    # e.g., 'attachment; filename=summary_20251004_xxx.json' or with quotes
    if not cd_header:
        return None
    parts = [p.strip() for p in cd_header.split(";")]
    for p in parts:
        if p.lower().startswith("filename="):
            name = p.split("=", 1)[1].strip()
            if name.startswith('"') and name.endswith('"'):
                name = name[1:-1]
            return name
    return None

def test_list_and_download(saved_file: Optional[str]) -> Optional[str]:
    print("→ GET /api/list")
    r = req("GET", "/api/list")
    print("  status:", r.status_code)
    r.raise_for_status()
    data = r.json()
    files = data.get("files", [])
    print("  files:", files)

    if not files:
        print("  (no files to download)")
        return None

    # Prefer the file we just created, else the last in the list
    target = saved_file or (files[-1] if files else None)
    if target is None:
        print("  (no target file determined)")
        return None

    print(f"→ GET /api/download/{target}")
    r2 = req("GET", f"/api/download/{target}")
    print("  status:", r2.status_code)
    r2.raise_for_status()

    # Determine a local filename to save
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    cd = r2.headers.get("Content-Disposition", "")
    fname = _filename_from_cd(cd) or target or "downloaded.json"
    local_path = os.path.join(DOWNLOAD_DIR, fname)

    # Save bytes to disk
    with open(local_path, "wb") as f:
        f.write(r2.content)

    # Optional: quick validation if it's JSON
    try:
        loaded = json.loads(r2.content.decode("utf-8"))
        print("  downloaded JSON keys:", list(loaded.keys()))
    except Exception:
        print("  (downloaded content is not valid JSON text; saved as bytes)")

    print("  saved to:", local_path)
    return local_path

def main():
    print(f"Base URL: {BASE_URL}  (timeout={TIMEOUT}s)")
    print("Starting smoke tests…\n")

    test_hello()
    _ = test_build_prompt(SAMPLE_SECTIONS)

    saved_file = test_summarize(SAMPLE_SECTIONS, allow_503=True)

    _ = test_list_and_download(saved_file)

    print("\nAll done. If no assertion failed, your API is responding as expected.")

if __name__ == "__main__":
    main()

import os
import json
import datetime as dt
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# --- Prompt builder (your module) ---
try:
    from backend.ai_prompt import build_prompt_from_sections
except Exception:
    from backend.ai_prompt import build_prompt_from_sections

# --- OpenAI SDK (≥ 1.0) ---
try:
    from openai import OpenAI
except Exception as e:
    raise RuntimeError(
        "OpenAI SDK not found. Install it with: pip install -U openai"
    ) from e


# -----------------------------
# App setup
# -----------------------------
load_dotenv()  # Load environment variables

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OUTPUTS_DIR = os.getenv("OUTPUTS_DIR", "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # allow everything during dev

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


# -----------------------------
# Helpers
# -----------------------------
def _timestamped_filename(prefix: str = "summary", ext: str = "json") -> str:
    now = dt.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    return f"{prefix}_{now}.{ext}"


def _save_json_to_outputs(payload: dict, filename: str | None = None) -> str:
    """Save dict as JSON under OUTPUTS_DIR; return filename."""
    if filename is None:
        filename = _timestamped_filename()
    path = os.path.join(OUTPUTS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return filename


# -----------------------------
# Section normalization
# -----------------------------
ALIAS_MAP = {
    "results and discussion": "results",
    "results & discussion": "results",
    "results/discussion": "results",
    "discussion and results": "discussion",
    "conclusions": "conclusion",
    "intro": "introduction",
    "abstracts": "abstract",
}


def normalize_sections(sections: dict) -> dict:
    """Normalize keys to canonical names and merge duplicates."""
    out: dict[str, str] = {}
    for k, v in sections.items():
        if not isinstance(k, str):
            continue
        key = k.strip().lower()
        key = ALIAS_MAP.get(key, key)
        if key in out and out[key].strip():
            out[key] = out[key].rstrip() + "\n\n" + (v or "")
        else:
            out[key] = v or ""
    return out


# -----------------------------
# Routes
# -----------------------------

# 🔹 Dev/test endpoints
@app.get("/api/hello")
def hello():
    return jsonify({"msg": "Hello from backend"})

@app.get("/s")
def hello2():
    return jsonify({"msg": "Hello from Flask"})


# 🔹 Build prompt route
@app.post("/api/build_prompt")
def build_prompt():
    data = request.get_json(silent=True) or {}
    sections = data.get("sections")
    if not isinstance(sections, dict):
        return jsonify({"error": "'sections' must be an object/dict"}), 400

    prompt = build_prompt_from_sections(sections)
    return jsonify({"prompt": prompt})


# 🔹 Summarize route
@app.post("/api/summarize")
def summarize():
    data = request.get_json(silent=True) or {}
    sections = data.get("sections")
    if not isinstance(sections, dict):
        return jsonify({"error": "'sections' must be an object/dict"}), 400

    if not OPENAI_API_KEY or not client:
        return jsonify({"error": "OPENAI_API_KEY not configured"}), 503

    prompt = build_prompt_from_sections(sections)

    try:
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10000,
            response_format={"type": "json_object"},
        )
        content = completion.choices[0].message.content
        parsed = json.loads(content)

        filename = _save_json_to_outputs(parsed)
        return jsonify({
            "message": "Summary saved successfully",
            "file": filename,
            "json": parsed
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 🔹 Download route
@app.get("/api/download/<path:filename>")
def download_json(filename: str):
    try:
        return send_from_directory(OUTPUTS_DIR, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


# 🔹 List all outputs
@app.get("/api/list")
def list_outputs():
    files = sorted(os.listdir(OUTPUTS_DIR))
    return jsonify({"files": files})


# -----------------------------
# Entry point
# -----------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)

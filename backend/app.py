import os
import json
import datetime as dt
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# --- Prompt builder (yours) ---
try:
    from backend.ai_prompt import build_prompt_from_sections
except Exception:
    from ai_prompt import build_prompt_from_sections

# --- OpenAI (new SDK ≥ 1.0) ---
try:
    from openai import OpenAI
except Exception as e:
    raise RuntimeError(
        "OpenAI SDK not found. Install it with: pip install -U openai"
    ) from e


# -----------------------------
# App setup
# -----------------------------
load_dotenv()  # loads .env into os.environ

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # set in .env if you prefer another model
OUTPUTS_DIR = os.getenv("OUTPUTS_DIR", "outputs")

if not os.path.isdir(OUTPUTS_DIR):
    os.makedirs(OUTPUTS_DIR, exist_ok=True)

app = Flask(__name__)
# Allow any frontend during dev; tighten for prod if needed
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Create client (env var OPENAI_API_KEY is picked up automatically, but we also check explicitly)
if not OPENAI_API_KEY:
    print("WARNING: OPENAI_API_KEY is not set; /api/summarize will return 503")
client = OpenAI(api_key=OPENAI_API_KEY)


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
# Map common alias keys (from parser output) to canonical keys expected by the prompt builder.
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
    """Normalize keys to canonical names and merge duplicates.

    - Lowercases keys, trims whitespace, maps aliases via ALIAS_MAP.
    - If multiple keys map to the same canonical key, their text is concatenated with a blank line.
    """
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
@app.route("/api/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Hello from backend"})


@app.route("/api/build_prompt", methods=["POST"])
def build_prompt():
    """
    Request JSON: { "sections": { "abstract": "...", "results": "...", ... } }
    Response JSON: { "prompt": "..." }
    """
    data = request.get_json(silent=True) or {}
    sections = data.get("sections")
    if not isinstance(sections, dict):
        return jsonify({"error": "'sections' must be an object/dict"}), 400

    prompt = build_prompt_from_sections(sections)
    return jsonify({"prompt": prompt})


@app.route("/api/summarize", methods=["POST"])
def summarize():
    """
    Builds the prompt, calls OpenAI with JSON mode, saves the JSON to /outputs,
    and returns the parsed JSON + filename.

    Request JSON: { "sections": { "abstract": "...", "results": "...", ... } }
    Response JSON: { "message": "...", "file": "summary_*.json", "json": {...} }
    """
    data = request.get_json(silent=True) or {}
    sections = data.get("sections")
    if not isinstance(sections, dict):
        return jsonify({"error": "'sections' must be an object/dict"}), 400

    if not OPENAI_API_KEY:
        return jsonify({"error": "OPENAI_API_KEY not configured"}), 503

    prompt = build_prompt_from_sections(sections)

    try:
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10000,
            # Force valid JSON:
            response_format={"type": "json_object"},
        )
        content = completion.choices[0].message.content

        # Should always be valid JSON because of response_format
        parsed = json.loads(content)

        filename = _save_json_to_outputs(parsed)
        return jsonify({
            "message": "Summary saved successfully",
            "file": filename,
            "json": parsed
        })
    except Exception as e:
        # Return model/server error details for debugging
        return jsonify({"error": str(e)}), 500


@app.route("/api/download/<path:filename>", methods=["GET"])
def download_json(filename: str):
    """Download a previously saved JSON from /outputs."""
    try:
        return send_from_directory(OUTPUTS_DIR, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


@app.route("/api/list", methods=["GET"])
def list_outputs():
    """Convenience endpoint to list saved JSON files."""
    files = sorted(os.listdir(OUTPUTS_DIR))
    return jsonify({"files": files})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
    
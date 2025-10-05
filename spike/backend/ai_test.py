import os, json, re, argparse

# Load .env (optional)
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Import your prompt builder
from ai_prompt import build_prompt_from_sections

# ---- Config helpers ----
def _clean_env(s: str | None, default: str = "") -> str:
    # strip trailing inline comments like "gpt-4o # primary"
    if not s:
        return default
    return s.split("#", 1)[0].strip()

MODEL_PRIMARY   = _clean_env(os.getenv("AI_MODEL_PRIMARY"), "gpt-4o")
MODEL_FALLBACK  = _clean_env(os.getenv("AI_MODEL_FALLBACK"), "")
TEMP            = float(_clean_env(os.getenv("AI_TEMPERATURE"), "0.25") or "0.25")
OUTPUT_PATH     = _clean_env(os.getenv("AI_OUTPUT"), "summary.json")
RUN_LLM_DEFAULT = _clean_env(os.getenv("AI_RUN_LLM"), "true").lower() not in ("0","false","no","off")

# ---- Minimal model caller with fallback (new SDK first, then legacy) ----
def _call_model(prompt: str, model: str, temperature: float = 0.25, max_tokens: int = 900) -> str:
    # Try new SDK
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        resp = client.chat.completions.create(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": "Return ONLY strict JSON—no extra text."},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""
    except Exception:
        # Fallback to legacy SDK
        import openai
        if not openai.api_key:
            openai.api_key = os.getenv("OPENAI_API_KEY")
        resp = openai.ChatCompletion.create(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": "Return ONLY strict JSON—no extra text."},
                {"role": "user", "content": prompt},
            ],
        )
        return resp["choices"][0]["message"]["content"]

def _call_with_fallback(prompt: str, temperature: float) -> str:
    try:
        return _call_model(prompt, MODEL_PRIMARY, temperature=temperature)
    except Exception as e1:
        if MODEL_FALLBACK:
            try:
                return _call_model(prompt, MODEL_FALLBACK, temperature=temperature)
            except Exception as e2:
                raise RuntimeError(f"Primary failed ({e1}); fallback failed ({e2})")
        raise

# ---- JSON parsing that tolerates code fences ----
def _parse_json(s: str) -> dict:
    try:
        return json.loads(s)
    except Exception:
        pass
    t = s.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t)
        t = re.sub(r"\s*```$", "", t)
        try:
            return json.loads(t)
        except Exception:
            pass
    i, j = t.find("{"), t.rfind("}")
    if i != -1 and j != -1 and j > i:
        try:
            return json.loads(t[i:j+1])
        except Exception:
            pass
    return {"raw_output": s}

# ---- Sample sections (replace with your parsed text) ----
def sample_sections() -> dict:
    return {
        "abstract": "This paper explores links between vitamin D and metabolic/cardiovascular outcomes.",
        "discussion": "Associations suggest mechanisms; causality unclear due to confounders and study heterogeneity.",
        "conclusion": "Evidence is suggestive, not definitive; larger standardized RCTs are needed."
    }

def main():
    ap = argparse.ArgumentParser(
        description="Test ai_prompt.build_prompt_from_sections with .env defaults."
    )
    ap.add_argument("--prompt-only", action="store_true", help="Print the prompt and exit (no API call).")
    args = ap.parse_args()

    sections = sample_sections()  # swap with your real parsed dict
    prompt = build_prompt_from_sections(sections)

    # Always show the prompt for sanity
    print("\n===== PROMPT =====")
    print(prompt)

    # Decide whether to call the model
    run_llm = RUN_LLM_DEFAULT and not args.prompt_only
    if not run_llm:
        print("\n(run skipped — set AI_RUN_LLM=true in .env or omit --prompt-only)")
        return

    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not set. Put it in .env or your shell environment.")

    print(f"\nUsing model: {MODEL_PRIMARY}" + (f" (fallback: {MODEL_FALLBACK})" if MODEL_FALLBACK else ""))
    print(f"Temperature: {TEMP}")
    print(f"Output file: {OUTPUT_PATH}")

    raw = _call_with_fallback(prompt, temperature=TEMP)
    data = _parse_json(raw)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nSaved JSON to {OUTPUT_PATH}")
    print(json.dumps(data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()

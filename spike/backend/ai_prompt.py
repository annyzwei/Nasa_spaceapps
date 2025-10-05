import openai
import json
import os
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import re

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

_JSON_FORMAT_SPEC = """Return ONLY strict JSON (no prose, no markdown) with this schema:
{
  "summary": "string (2–3 sentences, factual and concise)",
  "key_findings": ["string", "..."],
  "limitations": ["string", "..."],
  "future_directions": ["string", "..."]
}
If something is unknown, use an empty string "" or an empty array [].
Do NOT include citations/IDs; keep each bullet under ~25 words.
"""

# Preferred order of sections when building prompts. Keep lowercase keys matching
# expected section names provided to `build_prompt_from_sections`.
_TARGET_FIELDS_ORDER = [
  "abstract",
  "introduction",
  "background",
  "methods",
  "materials",
  "results",
  "discussion",
  "conclusion",
  "references",
]

def build_prompt_from_sections(sections: Dict[str, str]) -> str:
    """
    Build a tightly-scoped prompt for hypothesis-oriented summarization.

    sections: dict[str, str] such as:
      {"abstract": "...", "introduction": "...", "results": "...", ...}
    """
    # Keep a consistent, researcher-friendly order; append any extras at the end
    ordered_keys = [k for k in _TARGET_FIELDS_ORDER if k in sections]
    extras = [k for k in sections.keys() if k not in ordered_keys]
    keys = ordered_keys + extras

    section_block = "\n\n".join(
        f"{k.upper()}:\n{sections[k].strip()}" for k in keys if sections.get(k, "").strip()
    )

    instructions = (
        "You are an expert scientific assistant helping researchers identify key findings and new, "
        "testable hypotheses from academic articles. Focus on factual accuracy. Assume the resesarchers "
        "have medium to little understanding of the topic and use language accordingly.\n\n"
        "Task:\n"
        "- Provide a concise 2–3 sentence summary.\n"
        "- Extract key findings (2-4 bullet list).\n"
        "- Note limitations/gaps (2-4 bullet list).\n"
        "- Suggest future research directions (2-4 bullet list).\n\n"
        + _JSON_FORMAT_SPEC
    )

    prompt = f"{instructions}\n\nTEXT:\n---\n{section_block}\n---"
    return prompt

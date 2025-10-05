#!/usr/bin/env python3
import os
import json
import time
from dataclasses import dataclass, field
from typing import Iterable, List, Dict
import pandas as pd
import requests
import xml.etree.ElementTree as ET

DATA_CSV = "./../data/SB_publication_PMC.csv"
OUTPUT_DIR = "./../data/summary"
OUTPUT_JSON = "subjects_tree.json"

# ========== Subject extraction (namespace-safe) ==============================

def _localname(tag: str) -> str:
    return tag.split('}', 1)[1] if tag.startswith('{') else tag

def _first(it: Iterable):
    for x in it:
        return x
    return None

@dataclass
class _TreeNode:
    label: str
    attrs: Dict[str, str] = field(default_factory=dict)
    children: List["_TreeNode"] = field(default_factory=list)

def _build_node(el: ET.Element) -> _TreeNode:
    subj = _first(c for c in el if _localname(c.tag) == "subject")
    label = (subj.text or "").strip() if subj is not None else ""
    attrs = {_localname(k): v for k, v in el.attrib.items()}
    kids = [_build_node(c) for c in el if _localname(c.tag) == "subj-group"]
    return _TreeNode(label=label, attrs=attrs, children=kids)

def _xml_subjects_to_tree(xml_text: str) -> List[_TreeNode]:
    root = ET.fromstring(xml_text)
    cats = _first(e for e in root.iter() if _localname(e.tag) == "article-categories")
    if cats is None:
        return []
    groups = [e for e in cats if _localname(e.tag) == "subj-group"]
    return [_build_node(g) for g in groups]

def subject_paths(xml_text: str, sep: str = " › ") -> List[str]:
    """Return leaf paths like 'Biology › Anatomy and Physiology › …'."""
    forest = _xml_subjects_to_tree(xml_text)
    out: List[str] = []

    def walk(n: _TreeNode, path: List[str]):
        nxt = path + ([n.label] if n.label else [])
        if not n.children and nxt:
            out.append(sep.join(nxt))
        for ch in n.children:
            walk(ch, nxt)

    for r in forest:
        walk(r, [])
    return out

# ========== Combined tree with PMC leaves ====================================

class ComboNode:
    __slots__ = ("label", "count", "children", "is_article")
    def __init__(self, label: str = "", *, is_article: bool = False):
        self.label = label
        self.count = 0                         # number of articles traversing this (subject) node
        self.children: Dict[str, "ComboNode"] = {}
        self.is_article = is_article           # True only for PMC leaf nodes

    def insert_path_with_article(self, parts: List[str], pmc_id: str):
        """
        Insert a subject path like ['Biology','Anatomy and Physiology','Bone']
        and then add a PMC leaf child (is_article=True) under the terminal subject.
        """
        node = self
        for p in parts:
            p = p.strip()
            if not p:
                continue
            # only increment counts on subject nodes (not on article leaves)
            node.count += 1
            node = node.children.setdefault(p, ComboNode(p))
        # Count the terminal subject node once more for the leaf itself
        node.count += 1

        # Add a PMC article leaf. Keep it distinct from subject labels.
        if pmc_id not in node.children:
            node.children[pmc_id] = ComboNode(pmc_id, is_article=True)

    def to_dict(self) -> Dict:
        # Sort: subjects first, then PMC leaves; each group alphabetically
        items = sorted(
            self.children.items(),
            key=lambda kv: (kv[1].is_article, kv[0])
        )
        return {
            "label": self.label,
            "count": self.count,
            "is_article": self.is_article,
            "children": [child.to_dict() for _, child in items],
        }

# ========== Network ==========================================================

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "pmc-subjects/1.0 (+research script)"})

def fetch_subject_paths(pmc_id: str, retries: int = 3, backoff: float = 1.5, timeout: int = 20) -> List[str]:
    """
    Fetch OAI-PMH pmc_fm and return subject leaf paths for a PMC id like 'PMC3630201'.
    """
    if not pmc_id or not pmc_id.startswith("PMC"):
        return []
    pmc_numeric = pmc_id[3:]
    url = "https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/"
    params = {
        "verb": "GetRecord",
        "identifier": f"oai:pubmedcentral.nih.gov:{pmc_numeric}",
        "metadataPrefix": "pmc_fm",
    }

    attempt = 0
    while attempt <= retries:
        try:
            r = SESSION.get(url, params=params, timeout=timeout)
            r.raise_for_status()
            return subject_paths(r.text)
        except requests.RequestException:
            if attempt == retries:
                return []
            time.sleep(backoff ** attempt)
            attempt += 1
    return []

# ========== Build one tree over all rows =====================================

def build_one_tree_with_pmc_leaves(df: pd.DataFrame, delay_sec: float = 0.34) -> ComboNode:
    root = ComboNode(label="")  # virtual root
    for pmc in df["pmc_id"].dropna().astype(str):
        pmc = pmc.strip()
        if not pmc:
            continue
        paths = fetch_subject_paths(pmc)
        if not paths:
            continue
        for p in paths:
            parts = [part.strip() for part in p.split("›")]
            root.insert_path_with_article(parts, pmc)
        time.sleep(delay_sec)  # polite rate limit
    return root

# ========== Main =============================================================

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    df = pd.read_csv(DATA_CSV)
    if "pmc_id" not in df.columns:
        df["pmc_id"] = df["Link"].str.extract(r'articles/(PMC\d+)/?')

    # Optional: test on a subset
    # df = df.head(20)

    combo_root = build_one_tree_with_pmc_leaves(df)
    out_path = os.path.join(OUTPUT_DIR, OUTPUT_JSON)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(combo_root.to_dict(), f, ensure_ascii=False, indent=2)
    print(f"Wrote combined subject tree → {out_path}")

if __name__ == "__main__":
    main()

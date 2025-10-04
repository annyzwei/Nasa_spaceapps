import os
import glob
import json
from bs4 import BeautifulSoup

RAW_DIR = "../data/raw"
TEXT_DIR = "../data/text"
os.makedirs(TEXT_DIR, exist_ok=True)

# Key sections by title (lowercase for consistency)
KEYWORDS = ["abstract", "discussion", "conclusion"]  

def extract_text_recursive(element, content):
    """Recursively extract text, skip H4/figure and unwanted classes."""
    # Skip h4 and figure entirely
    if hasattr(element, "name") and element.name in ["h4", "figure"]:
        return

    # Skip elements with classes associated with tables
    if hasattr(element, "has_attr") and element.has_attr("class"):
        if set(element["class"]) & {"tw", "xbox", "font-sm"}:
            return

    # include H3 headers as Markdown-style ###
    if hasattr(element, "name") and element.name == "h3":
        h3_title = element.get_text(strip=True)
        content.append(f"### {h3_title}")

    # Paragraphs, list items
    elif hasattr(element, "name") and element.name in ["p", "li"]:
        text = element.get_text(strip=True)
        if text:
            content.append(text)

    # Recursively handle children
    elif hasattr(element, "children"):
        for child in element.children:
            extract_text_recursive(child, content)

    # Text nodes
    elif isinstance(element, str):
        text = element.strip()
        if text:
            content.append(text)

def extract_section_text(section, stop_tag):
    """Extract all content under an H2 section until the next H2."""
    content = []
    for sibling in section.next_siblings:
        if sibling == stop_tag:
            break
        extract_text_recursive(sibling, content)
    return "\n\n".join(content)

def clean_text_to_dict(html):
    """Convert HTML to a dictionary: H2 titles as keys, content as values."""
    soup = BeautifulSoup(html, "html.parser")
    sections_dict = {}

    sections = soup.find_all("h2", class_="pmc_sec_title")
    for i, section in enumerate(sections):
        section_title = section.get_text(strip=True)

        # Keep only sections whose H2 title contains a keyword
        if not any(keyword in section_title.lower() for keyword in KEYWORDS):
            continue

        stop_tag = sections[i+1] if i+1 < len(sections) else None
        section_text = extract_section_text(section, stop_tag)

        if section_text:
            sections_dict[section_title.lower()] = section_text

    return sections_dict


def main():
    for path in glob.glob(f"{RAW_DIR}/*.html"):
        with open(path, encoding="utf-8") as f:
            html = f.read()

        sections_dict = clean_text_to_dict(html)

        # fname = os.path.splitext(os.path.basename(path))[0] + ".json" # save each json with article name
        fname = "temparticle.json"
        outpath = os.path.join(TEXT_DIR, fname)

        # Write the dictionary to a JSON file
        with open(outpath, "w", encoding="utf-8") as f:
            json.dump(sections_dict, f, indent=4)

        print(f"Extracted structured dictionary from {fname}")

if __name__ == "__main__":
    main()

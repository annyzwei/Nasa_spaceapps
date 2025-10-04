import os
import glob
from bs4 import BeautifulSoup

RAW_DIR = "../data/raw"
TEXT_DIR = "../data/text"
os.makedirs(TEXT_DIR, exist_ok=True)

# Sections to ignore by title
IGNORE_SECTIONS = [
    "Introduction",
    "Materials",
    "Methods",
    "Methodology",
    "References",
    "Acknowledgments",
    "Funding",
    "General Outcomes",
    "Author Contributions"
]

def extract_text_recursive(element, content):
    # Skip h4 and figure entirely
    if hasattr(element, "name") and element.name in ["h4", "figure"]:
        return

    # Skip elements with classes associated with tables
    if hasattr(element, "has_attr") and element.has_attr("class"):
        if set(element["class"]) & {"tw", "xbox", "font-sm"}:
            return

    # H3 headers
    if hasattr(element, "name") and element.name == "h3":
        h3_title = element.get_text(strip=True)
        content.append(f"### {h3_title}")

    # Paragraphs, list items, table cells
    elif hasattr(element, "name") and element.name in ["p", "li", "td", "th"]:
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
    """
    Extract all content under an H2 section until the next H2.
    """
    content = []
    for sibling in section.next_siblings:
        if sibling == stop_tag:
            break
        extract_text_recursive(sibling, content)
    return "\n\n".join(content)

def clean_text(html):
    soup = BeautifulSoup(html, "html.parser")
    content = []

    # Find all H2 sections
    sections = soup.find_all("h2", class_="pmc_sec_title")
    for i, section in enumerate(sections):
        section_title = section.get_text(strip=True)

        # Skip H2 if in ignore list
        if any(ignore.lower() in section_title.lower() for ignore in IGNORE_SECTIONS):
            continue

        # Keep H2 header
        content.append(f"## {section_title}")

        # Stop tag is next H2
        stop_tag = sections[i+1] if i+1 < len(sections) else None

        # Extract content under this H2
        section_text = extract_section_text(section, stop_tag)
        if section_text:
            content.append(section_text)

    return "\n\n".join(content)

def main():
    for path in glob.glob(f"{RAW_DIR}/*.html"):
        with open(path, encoding="utf-8") as f:
            html = f.read()

        text = clean_text(html)
        fname = os.path.splitext(os.path.basename(path))[0] + ".txt"
        outpath = os.path.join(TEXT_DIR, fname)

        with open(outpath, "w", encoding="utf-8") as f:
            f.write(text)

        print(f"Extracted structured text from {fname}")

if __name__ == "__main__":
    main()
from __future__ import annotations

import re


_ABBREVIATIONS = {
    "msrp": "price",
    "mpg": "miles per gallon",
    "mph": "miles per hour",
    "awd": "all wheel drive",
    "rwd": "rear wheel drive",
    "fwd": "front wheel drive",
}


def format_for_speech(text: str) -> str:
    rendered = text
    # Strip markdown headings (## heading → heading)
    rendered = re.sub(r"^#{1,6}\s+", "", rendered, flags=re.MULTILINE)
    # Strip bold/italic markers (**text** / *text* / __text__ / _text_)
    rendered = re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", rendered)
    rendered = re.sub(r"_{1,2}(.*?)_{1,2}", r"\1", rendered)
    # Strip inline code and code fences
    rendered = re.sub(r"`{1,3}[^`]*`{1,3}", "", rendered)
    # Strip blockquotes
    rendered = re.sub(r"^>\s+", "", rendered, flags=re.MULTILINE)
    # Strip bullet/numbered list markers
    rendered = re.sub(r"^\s*[-*+]\s+", "", rendered, flags=re.MULTILINE)
    rendered = re.sub(r"^\s*\d+\.\s+", "", rendered, flags=re.MULTILINE)
    rendered = rendered.replace("/", " and ")

    for abbr, expanded in _ABBREVIATIONS.items():
        rendered = re.sub(rf"\b{abbr}\b", expanded, rendered, flags=re.IGNORECASE)

    rendered = re.sub(r"\$\s*(\d{2,3}(?:,\d{3})+)", r"\1 dollars", rendered)
    rendered = re.sub(r"\s+", " ", rendered)
    return rendered.strip()

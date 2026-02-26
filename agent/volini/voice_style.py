from __future__ import annotations

import re


_ABBREVIATIONS = {
    "msrp": "price",
    "awd": "all wheel drive",
    "rwd": "rear wheel drive",
    "fwd": "front wheel drive",
    "mt": "manual transmission",
    "at": "automatic transmission",
}


def format_for_speech(text: str) -> str:
    rendered = text
    rendered = rendered.replace("/", " and ")

    for abbr, expanded in _ABBREVIATIONS.items():
        rendered = re.sub(rf"\b{abbr}\b", expanded, rendered, flags=re.IGNORECASE)

    rendered = re.sub(r"\$\s*(\d{2,3}(?:,\d{3})+)", r"\1 dollars", rendered)
    rendered = re.sub(r"\s+", " ", rendered)
    return rendered.strip()

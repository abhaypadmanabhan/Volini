from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
import re


@dataclass(frozen=True)
class VehicleMatch:
    make: str
    model: str
    alias: str
    score: float


_ALIASES: dict[str, tuple[str, str]] = {
    "miata": ("Mazda", "MX-5 Miata"),
    "mx5": ("Mazda", "MX-5 Miata"),
    "mx-5": ("Mazda", "MX-5 Miata"),
    "master rx5": ("Mazda", "RX-5"),
    "rx5": ("Mazda", "RX-5"),
    "rx-5": ("Mazda", "RX-5"),
    "civic": ("Honda", "Civic"),
    "corolla": ("Toyota", "Corolla"),
    "model 3": ("Tesla", "Model 3"),
}


def _normalize(text: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s-]", " ", text.lower())
    return re.sub(r"\s+", " ", normalized).strip()


def resolve_vehicle(text: str) -> VehicleMatch | None:
    normalized = _normalize(text)
    for alias, (make, model) in _ALIASES.items():
        if alias in normalized:
            return VehicleMatch(make=make, model=model, alias=alias, score=1.0)

    best_alias = ""
    best_score = 0.0
    for alias in _ALIASES:
        score = SequenceMatcher(a=alias, b=normalized).ratio()
        if score > best_score:
            best_alias = alias
            best_score = score

    if best_score >= 0.55:
        make, model = _ALIASES[best_alias]
        return VehicleMatch(make=make, model=model, alias=best_alias, score=best_score)
    return None

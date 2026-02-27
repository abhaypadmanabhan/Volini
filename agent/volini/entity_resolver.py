from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
import re
from urllib.request import Request, urlopen
import json
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class VehicleMatch:
    make: str
    model: str
    alias: str
    score: float


# Hard-coded common aliases (spoken name → make, model)
_ALIASES: dict[str, tuple[str, str]] = {
    "miata": ("Mazda", "MX-5 Miata"),
    "mx5": ("Mazda", "MX-5 Miata"),
    "mx-5": ("Mazda", "MX-5 Miata"),
    "rx5": ("Mazda", "RX-5"),
    "rx-5": ("Mazda", "RX-5"),
    "civic": ("Honda", "Civic"),
    "corolla": ("Toyota", "Corolla"),
    "camry": ("Toyota", "Camry"),
    "model 3": ("Tesla", "Model 3"),
    "model s": ("Tesla", "Model S"),
    "model x": ("Tesla", "Model X"),
    "model y": ("Tesla", "Model Y"),
    "mustang": ("Ford", "Mustang"),
    "f150": ("Ford", "F-150"),
    "f-150": ("Ford", "F-150"),
    "silverado": ("Chevrolet", "Silverado"),
    "malibu": ("Chevrolet", "Malibu"),
    "accord": ("Honda", "Accord"),
    "altima": ("Nissan", "Altima"),
    "maxima": ("Nissan", "Maxima"),
    "rogue": ("Nissan", "Rogue"),
    "3 series": ("BMW", "3 Series"),
    "5 series": ("BMW", "5 Series"),
    "m3": ("BMW", "M3"),
    "m5": ("BMW", "M5"),
    "c class": ("Mercedes-Benz", "C-Class"),
    "e class": ("Mercedes-Benz", "E-Class"),
    "a4": ("Audi", "A4"),
    "a6": ("Audi", "A6"),
    "q5": ("Audi", "Q5"),
    "wrangler": ("Jeep", "Wrangler"),
    "cherokee": ("Jeep", "Cherokee"),
    "911": ("Porsche", "911"),
    "cayenne": ("Porsche", "Cayenne"),
    "rav4": ("Toyota", "RAV4"),
    "highlander": ("Toyota", "Highlander"),
    "tacoma": ("Toyota", "Tacoma"),
    "tundra": ("Toyota", "Tundra"),
    "cr-v": ("Honda", "CR-V"),
    "crv": ("Honda", "CR-V"),
    "pilot": ("Honda", "Pilot"),
    "prius": ("Toyota", "Prius"),
}

# NHTSA makes list — fetched once at module load, used for brand recognition
_NHTSA_MAKES: list[str] = []


def _load_nhtsa_makes() -> None:
    """Fetch all vehicle makes from NHTSA. Runs once at import time."""
    global _NHTSA_MAKES
    try:
        url = "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json"
        req = Request(url, headers={"User-Agent": "Volini/1.0"})
        with urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        _NHTSA_MAKES = [
            item["Make_Name"].strip()
            for item in data.get("Results", [])
            if item.get("Make_Name")
        ]
        logger.info("Loaded %d NHTSA makes", len(_NHTSA_MAKES))
    except Exception as e:
        logger.warning("Could not load NHTSA makes: %s", e)
        _NHTSA_MAKES = []


_load_nhtsa_makes()


def _normalize(text: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s-]", " ", text.lower())
    return re.sub(r"\s+", " ", normalized).strip()


def resolve_vehicle(text: str) -> VehicleMatch | None:
    normalized = _normalize(text)

    # 1. Exact alias match (handles spoken names like "miata", "f-150")
    for alias, (make, model) in _ALIASES.items():
        if alias in normalized:
            return VehicleMatch(make=make, model=model, alias=alias, score=1.0)

    # 2. Fuzzy alias match
    best_alias, best_score = "", 0.0
    for alias in _ALIASES:
        score = SequenceMatcher(a=alias, b=normalized).ratio()
        if score > best_score:
            best_alias, best_score = alias, score
    if best_score >= 0.55:
        make, model = _ALIASES[best_alias]
        return VehicleMatch(make=make, model=model, alias=best_alias, score=best_score)

    # 3. NHTSA make scan — if any official make name appears in the query,
    #    return a make-only match so retriever can look up models
    for make in _NHTSA_MAKES:
        if make.lower() in normalized:
            return VehicleMatch(make=make, model="", alias=make.lower(), score=0.8)

    return None

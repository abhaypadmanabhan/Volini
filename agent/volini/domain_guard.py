from __future__ import annotations

from dataclasses import dataclass

from .entity_resolver import resolve_vehicle


@dataclass(frozen=True)
class DomainVerdict:
    allowed: bool
    reason: str
    redirect_message: str


_CAR_KEYWORDS = {
    "car",
    "cars",
    "vehicle",
    "automotive",
    "engine",
    "horsepower",
    "torque",
    "trim",
    "msrp",
    "price",
    "sedan",
    "suv",
    "hatchback",
    "roadster",
    "ev",
    "hybrid",
}


def classify_domain(text: str) -> DomainVerdict:
    lowered = text.lower()
    if resolve_vehicle(text) is not None:
        return DomainVerdict(True, "vehicle_resolved", "")

    if any(keyword in lowered for keyword in _CAR_KEYWORDS):
        return DomainVerdict(True, "car_keyword", "")

    return DomainVerdict(
        False,
        "off_topic",
        "I am Volini and I only discuss cars, trims, prices, specs, and ownership.",
    )

from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from typing import Any, Callable
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from .domain_guard import classify_domain
from .entity_resolver import VehicleMatch, resolve_vehicle
from .voice_style import format_for_speech

JsonFetcher = Callable[[str], dict[str, Any]]
TextFetcher = Callable[[str], str]


class CarResearchService:
    def __init__(
        self,
        *,
        fetch_json: JsonFetcher | None = None,
        fetch_text: TextFetcher | None = None,
    ) -> None:
        self._fetch_json = fetch_json or self._default_fetch_json
        self._fetch_text = fetch_text or self._default_fetch_text

    def answer_question(self, question: str) -> dict[str, Any]:
        verdict = classify_domain(question)
        if not verdict.allowed:
            return {
                "summary": verdict.redirect_message,
                "sources": [],
                "topic_allowed": False,
            }

        vehicle = resolve_vehicle(question)
        if vehicle is None:
            return {
                "summary": "Tell me the exact car model and I will fetch the latest details.",
                "sources": [],
                "topic_allowed": True,
            }

        current_year = datetime.now(timezone.utc).year
        lookup_year = current_year + 1
        models = self._fetch_nhtsa_models(vehicle.make)
        model_hint = self._pick_model_name(vehicle, models)
        price_hint = self._fetch_price_hint(vehicle, lookup_year)

        source_list = [
            "https://vpic.nhtsa.dot.gov/api/",
            "https://duckduckgo.com/",
        ]

        summary = (
            f"For {vehicle.make} {model_hint}, the newest likely model year is around {lookup_year}. "
            f"{price_hint}"
        )
        return {
            "summary": format_for_speech(summary),
            "sources": source_list,
            "topic_allowed": True,
            "vehicle": {
                "make": vehicle.make,
                "model": model_hint,
            },
        }

    def _pick_model_name(self, vehicle: VehicleMatch, models: list[str]) -> str:
        for model in models:
            if vehicle.model.lower().replace("-", "") in model.lower().replace("-", ""):
                return model
        return vehicle.model

    def _fetch_nhtsa_models(self, make: str) -> list[str]:
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/{quote_plus(make)}?format=json"
        payload = self._fetch_json(url)
        models = payload.get("Results", [])
        return [item.get("Model_Name", "") for item in models if item.get("Model_Name")]

    def _fetch_price_hint(self, vehicle: VehicleMatch, year: int) -> str:
        query = quote_plus(f"{year} {vehicle.make} {vehicle.model} MSRP")
        url = f"https://duckduckgo.com/html/?q={query}"
        page = self._fetch_text(url)
        prices = re.findall(r"\$\s?\d{2,3}(?:,\d{3})+", page)
        if prices:
            best = prices[0].replace("$", "").strip()
            return f"I found recent web pricing signals near {best} dollars MSRP, but verify with local dealers."
        return "I could not verify a reliable current MSRP yet, but I can compare trims and specs right now."

    def _default_fetch_json(self, url: str) -> dict[str, Any]:
        request = Request(url, headers={"User-Agent": "Volini/1.0"})
        with urlopen(request, timeout=12) as response:
            data = response.read().decode("utf-8")
        return json.loads(data)

    def _default_fetch_text(self, url: str) -> str:
        request = Request(url, headers={"User-Agent": "Volini/1.0"})
        with urlopen(request, timeout=12) as response:
            return response.read().decode("utf-8", errors="ignore")

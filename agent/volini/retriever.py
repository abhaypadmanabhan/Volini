from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
import re
from typing import Any, Callable
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from .car_knowledge import CarKnowledgeService, fetch_full_profile
from .domain_guard import classify_domain
from .entity_resolver import VehicleMatch, resolve_vehicle
from .voice_style import format_for_speech

JsonFetcher = Callable[[str], dict[str, Any]]
TextFetcher = Callable[[str], str]

_nhtsa_cache: dict[str, list[str]] = {}


class CarResearchService:
    def __init__(
        self,
        *,
        fetch_json: JsonFetcher | None = None,
        fetch_text: TextFetcher | None = None,
        knowledge: CarKnowledgeService | None = None,
    ) -> None:
        self._fetch_json = fetch_json or self._default_fetch_json
        self._fetch_text = fetch_text or self._default_fetch_text
        self._knowledge = knowledge or CarKnowledgeService()

    async def answer_question(self, question: str) -> dict[str, Any]:
        # 1. Domain check (unchanged)
        verdict = classify_domain(question)
        if not verdict.allowed:
            return {
                "summary": verdict.redirect_message,
                "sources": [],
                "topic_allowed": False,
            }

        # 2. Entity resolve (unchanged)
        vehicle = resolve_vehicle(question)
        if vehicle is None:
            return {
                "summary": "Tell me the exact car model and I will fetch the latest details.",
                "sources": [],
                "topic_allowed": True,
            }

        # 3. Increment query frequency
        self._knowledge.increment_frequency(vehicle.make, vehicle.model)

        current_year = datetime.now(timezone.utc).year
        lookup_year = current_year + 1

        # 4. Cache-first: if fresh data exists, use it
        if self._knowledge.is_fresh(vehicle.make, vehicle.model):
            profile = self._knowledge.get_cached_profile(vehicle.make, vehicle.model)
            if profile:
                summary = self._build_summary(vehicle, profile, lookup_year)
                return {
                    "summary": format_for_speech(summary),
                    "sources": ["cached"],
                    "topic_allowed": True,
                    "vehicle": {"make": vehicle.make, "model": vehicle.model},
                }

        # 5. Fetch from all APIs in parallel
        profile = await fetch_full_profile(vehicle.make, vehicle.model, lookup_year)

        # 6. Store in cache
        self._knowledge.store_profile(
            vehicle.make,
            vehicle.model,
            nhtsa_data=profile.get("nhtsa_data"),
            fuel_economy=profile.get("fuel_economy"),
            specs=profile.get("specs"),
            msrp_signal=profile.get("msrp_signal"),
        )

        # 7. Build summary and return
        summary = self._build_summary(vehicle, profile, lookup_year)
        return {
            "summary": format_for_speech(summary),
            "sources": [
                "https://vpic.nhtsa.dot.gov/api/",
                "https://api.nhtsa.gov/SafetyRatings/",
                "https://www.fueleconomy.gov/",
                "https://duckduckgo.com/",
            ],
            "topic_allowed": True,
            "vehicle": {"make": vehicle.make, "model": vehicle.model},
        }

    def _build_summary(self, vehicle: VehicleMatch, profile: dict, lookup_year: int) -> str:
        """Build a natural-language speech-ready summary from available profile data."""
        parts = []
        subject = f"{vehicle.make} {vehicle.model}"

        # MSRP signal
        msrp = profile.get("msrp_signal")
        if msrp:
            # msrp_signal may be stored as a string like "$33,300" or dict or raw text
            if isinstance(msrp, str):
                price_matches = re.findall(r'\$\s?\d{1,3}(?:,\d{3})+', msrp)
                if price_matches:
                    price = price_matches[0].replace("$", "").replace(",", "")
                    parts.append(f"Starting price is around {price} dollars")
                else:
                    parts.append(f"Pricing: {msrp[:100]}")
            elif isinstance(msrp, dict):
                parts.append(f"Pricing data available for {lookup_year}")

        # Fuel economy
        fuel = profile.get("fuel_economy")
        if fuel and isinstance(fuel, dict):
            # fueleconomy.gov may return various structures
            mpg = fuel.get("city") or fuel.get("highway") or fuel.get("combined")
            if mpg:
                parts.append(f"Fuel economy around {mpg} miles per gallon")

        # NHTSA safety
        nhtsa = profile.get("nhtsa_data")
        if nhtsa and isinstance(nhtsa, list) and len(nhtsa) > 0:
            # NHTSA returns a list of results; just note safety data is available
            parts.append("Safety ratings are available from NHTSA")

        # Fallback if no data found
        if not parts:
            parts.append(f"The {lookup_year} {subject} is confirmed in available records")

        return f"For the {subject}: " + ". ".join(parts) + "."

    # Keep sync helper methods unchanged
    def _fetch_nhtsa_models(self, make: str) -> list[str]:
        if make in _nhtsa_cache:
            return _nhtsa_cache[make]
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/{quote_plus(make)}?format=json"
        payload = self._fetch_json(url)
        models = [item.get("Model_Name", "") for item in payload.get("Results", []) if item.get("Model_Name")]
        _nhtsa_cache[make] = models
        return models

    def _default_fetch_json(self, url: str) -> dict[str, Any]:
        request = Request(url, headers={"User-Agent": "Volini/1.0"})
        with urlopen(request, timeout=12) as response:
            data = response.read().decode("utf-8")
        return json.loads(data)

    def _default_fetch_text(self, url: str) -> str:
        request = Request(url, headers={"User-Agent": "Volini/1.0"})
        with urlopen(request, timeout=12) as response:
            return response.read().decode("utf-8", errors="ignore")

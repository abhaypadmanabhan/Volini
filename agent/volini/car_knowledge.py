"""
car_knowledge.py — SQLite-backed cache for car data + async API fetchers.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import sqlite3
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

import aiohttp

# ---------------------------------------------------------------------------
# Default DB path
# ---------------------------------------------------------------------------

_DEFAULT_DB_PATH = Path(__file__).parent / "data" / "car_profiles.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS car_profiles (
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    nhtsa_data TEXT,
    fuel_economy TEXT,
    specs TEXT,
    msrp_signal TEXT,
    PRIMARY KEY (make, model)
);

CREATE TABLE IF NOT EXISTS query_frequency (
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    query_count INTEGER DEFAULT 1,
    last_queried TEXT NOT NULL,
    PRIMARY KEY (make, model)
);
"""

_CACHE_TTL = timedelta(hours=24)


# ---------------------------------------------------------------------------
# CarKnowledgeService
# ---------------------------------------------------------------------------


class CarKnowledgeService:
    def __init__(self, db_path: str | None = None) -> None:
        if db_path is None:
            resolved = str(_DEFAULT_DB_PATH)
            _DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        else:
            resolved = db_path
            if resolved != ":memory:":
                Path(resolved).parent.mkdir(parents=True, exist_ok=True)

        self._lock = threading.Lock()
        self._conn = sqlite3.connect(resolved, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------

    def is_fresh(self, make: str, model: str) -> bool:
        """Returns True if last_updated is within the 24-hour TTL."""
        with self._lock:
            row = self._conn.execute(
                "SELECT last_updated FROM car_profiles WHERE make = ? AND model = ?",
                (make, model),
            ).fetchone()
        if row is None:
            return False
        try:
            last_updated = datetime.fromisoformat(row["last_updated"])
            if last_updated.tzinfo is None:
                last_updated = last_updated.replace(tzinfo=timezone.utc)
            return (datetime.now(timezone.utc) - last_updated) < _CACHE_TTL
        except (ValueError, TypeError):
            return False

    def get_cached_profile(self, make: str, model: str) -> dict | None:
        """Returns a dict with parsed profile fields, or None if not cached."""
        with self._lock:
            row = self._conn.execute(
                "SELECT nhtsa_data, fuel_economy, specs, msrp_signal "
                "FROM car_profiles WHERE make = ? AND model = ?",
                (make, model),
            ).fetchone()
        if row is None:
            return None

        def _parse(val: str | None) -> Any:
            if val is None:
                return None
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return val

        return {
            "nhtsa_data": _parse(row["nhtsa_data"]),
            "fuel_economy": _parse(row["fuel_economy"]),
            "specs": _parse(row["specs"]),
            "msrp_signal": _parse(row["msrp_signal"]),
        }

    def store_profile(
        self,
        make: str,
        model: str,
        *,
        nhtsa_data=None,
        fuel_economy=None,
        specs=None,
        msrp_signal=None,
    ) -> None:
        """INSERT OR REPLACE a car profile, storing each field as JSON."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO car_profiles
                    (make, model, last_updated, nhtsa_data, fuel_economy, specs, msrp_signal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    make,
                    model,
                    now,
                    json.dumps(nhtsa_data),
                    json.dumps(fuel_economy),
                    json.dumps(specs),
                    json.dumps(msrp_signal),
                ),
            )
            self._conn.commit()

    def increment_frequency(self, make: str, model: str) -> None:
        """Upsert query_frequency, incrementing query_count on conflict."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO query_frequency (make, model, query_count, last_queried)
                VALUES (?, ?, 1, ?)
                ON CONFLICT(make, model)
                DO UPDATE SET query_count = query_count + 1, last_queried = excluded.last_queried
                """,
                (make, model, now),
            )
            self._conn.commit()

    def get_top_cars(self, n: int = 10) -> list[tuple[str, str]]:
        """Returns (make, model) tuples ordered by query_count DESC."""
        with self._lock:
            rows = self._conn.execute(
                "SELECT make, model FROM query_frequency ORDER BY query_count DESC LIMIT ?",
                (n,),
            ).fetchall()
        return [(row["make"], row["model"]) for row in rows]

    def close(self) -> None:
        """Close the SQLite connection."""
        self._conn.close()


# ---------------------------------------------------------------------------
# Async fetch helpers
# ---------------------------------------------------------------------------

_TIMEOUT = aiohttp.ClientTimeout(total=10)
_HEADERS = {"User-Agent": "Volini/1.0"}
_PRICE_RE = re.compile(r'\$\s?\d{1,3}(?:,\d{3})+')


async def fetch_fuel_economy(make: str, model: str, year: int) -> dict | None:
    """Fetch fuel economy data from fueleconomy.gov (free, no key)."""
    url = (
        f"https://www.fueleconomy.gov/ws/rest/vehicle/menu/options"
        f"?year={year}&make={make}&model={model}"
    )
    try:
        async with aiohttp.ClientSession(timeout=_TIMEOUT, headers=_HEADERS) as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    return None
                text = await resp.text()
                # Return raw XML as a dict with a single key for downstream parsing
                return {"xml": text, "make": make, "model": model, "year": year}
    except Exception:
        return None


async def fetch_nhtsa_safety(make: str, model: str, year: int) -> dict | None:
    """Fetch NHTSA safety ratings (free, no key). Returns Results list or None."""
    url = (
        f"https://api.nhtsa.gov/SafetyRatings/modelyear/{year}"
        f"/make/{make}/model/{model}"
    )
    try:
        async with aiohttp.ClientSession(timeout=_TIMEOUT, headers=_HEADERS) as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json(content_type=None)
                return data.get("Results")
    except Exception:
        return None


async def fetch_carquery_specs(make: str, model: str) -> dict | None:
    """Fetch specs from CarQueryAPI (free, no key). Returns first trim's data."""
    url = (
        f"https://www.carqueryapi.com/api/0.3/"
        f"?cmd=getTrims&make={make}&model={model}&full_results=1"
    )
    try:
        async with aiohttp.ClientSession(timeout=_TIMEOUT, headers=_HEADERS) as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    return None
                text = await resp.text()
                # Strip JSONP wrapper: ?(...);\n
                stripped = re.sub(r'^\w*\(|\);\s*$', '', text.strip())
                data = json.loads(stripped)
                trims = data.get("Trims")
                if not trims:
                    return None
                return trims[0]
    except Exception:
        return None


async def fetch_msrp_duckduckgo(make: str, model: str, year: int) -> str | None:
    """Scrape DuckDuckGo for MSRP signal. Returns first price found or None."""
    query = f"{year} {make} {model} MSRP price"
    try:
        async with aiohttp.ClientSession(timeout=_TIMEOUT, headers=_HEADERS) as session:
            async with session.post(
                "https://duckduckgo.com/html/",
                data={"q": query},
                headers={**_HEADERS, "Content-Type": "application/x-www-form-urlencoded"},
            ) as resp:
                if resp.status != 200:
                    return None
                html = await resp.text()
                matches = _PRICE_RE.findall(html)
                return matches[0] if matches else None
    except Exception:
        return None


async def fetch_msrp_brave(make: str, model: str, year: int) -> str | None:
    """Fetch MSRP via Brave Search API. Requires BRAVE_API_KEY env var."""
    brave_key = os.environ.get("BRAVE_API_KEY")
    if not brave_key:
        return None
    query = f"{year} {make} {model} MSRP price"
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        **_HEADERS,
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": brave_key,
    }
    params = {"q": query, "count": 5}
    try:
        async with aiohttp.ClientSession(timeout=_TIMEOUT, headers=headers) as session:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json(content_type=None)
                results = data.get("web", {}).get("results", [])
                for result in results:
                    snippet = result.get("description", "") or (result.get("extra_snippets") or [""])[0]
                    matches = _PRICE_RE.findall(snippet)
                    if matches:
                        return matches[0]
                return None
    except Exception:
        return None


async def fetch_msrp(make: str, model: str, year: int) -> str | None:
    """MSRP orchestrator: uses Brave if BRAVE_API_KEY set, else DuckDuckGo."""
    brave_key = os.environ.get("BRAVE_API_KEY")
    if brave_key:
        result = await fetch_msrp_brave(make, model, year)
        if result:
            return result
    return await fetch_msrp_duckduckgo(make, model, year)


async def fetch_full_profile(make: str, model: str, year: int) -> dict:
    """Fetch all data sources in parallel. Returns dict with available data."""
    results = await asyncio.gather(
        fetch_nhtsa_safety(make, model, year),
        fetch_fuel_economy(make, model, year),
        fetch_carquery_specs(make, model),
        fetch_msrp(make, model, year),
        return_exceptions=True,
    )
    nhtsa_data, fuel_economy, specs, msrp_signal = results
    return {
        "nhtsa_data": None if isinstance(nhtsa_data, Exception) else nhtsa_data,
        "fuel_economy": None if isinstance(fuel_economy, Exception) else fuel_economy,
        "specs": None if isinstance(specs, Exception) else specs,
        "msrp_signal": None if isinstance(msrp_signal, Exception) else msrp_signal,
    }

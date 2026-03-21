"""
Loads car data for the RAG knowledge base.

Primary source: knowledge/data/seed_cars.json (hand-authored, always present)
"""

import json
import os

_SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "seed_cars.json")


def load_seed_cars() -> list[dict]:
    """Load cars from the seed JSON file."""
    with open(_SEED_PATH, "r") as f:
        return json.load(f)


async def collect_all_cars() -> list[dict]:
    """Return all cars to index. Currently uses seed data only."""
    return load_seed_cars()

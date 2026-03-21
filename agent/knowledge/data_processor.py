"""
Converts structured car dicts into embeddable text chunks.

Each car produces 7 chunk types so different query types match different chunks:
  overview, specs, pricing, comparison, enthusiast, reliability, buying_guide
"""


def _safe_id(text: str) -> str:
    return text.lower().replace(" ", "_").replace("/", "_").replace("-", "_")


def _chunk_id(car: dict, chunk_type: str) -> str:
    make = _safe_id(car["make"])
    model = _safe_id(car["model"])
    year = car.get("year", "")
    return f"{make}_{model}_{year}_{chunk_type}"


def _overview(car: dict) -> str:
    return (
        f"The {car['year']} {car['make']} {car['model']} is a {car['category'].replace('_', ' ')} "
        f"with a {car['engine']} producing {car['horsepower']} horsepower and {car['torque']}. "
        f"It comes with {car['transmission']} and {car['drivetrain']} drivetrain."
    )


def _specs(car: dict) -> str:
    fe = car.get("fuel_economy", {})
    mpg = (
        f"{fe.get('city', '?')} city / {fe.get('highway', '?')} highway / {fe.get('combined', '?')} combined MPG"
        if fe
        else "fuel economy not available"
    )
    return (
        f"{car['year']} {car['make']} {car['model']} specs: "
        f"{car['horsepower']}hp, {car['torque']}, {car['drivetrain']}, "
        f"0-60 in {car.get('zero_to_sixty', '?')}s, curb weight {car.get('curb_weight', '?')}. "
        f"Engine: {car['engine']}. Transmission: {car['transmission']}. "
        f"Fuel economy: {mpg}."
    )


def _pricing(car: dict) -> str:
    price = car.get("base_price")
    price_str = f"${price:,}" if price else "price not available"
    fe = car.get("fuel_economy", {})
    mpg = (
        f"{fe.get('city', '?')} city / {fe.get('highway', '?')} highway / {fe.get('combined', '?')} combined MPG"
        if fe
        else "fuel economy not available"
    )
    safety = car.get("safety_rating", "not rated")
    return (
        f"The {car['year']} {car['make']} {car['model']} starts at {price_str} MSRP. "
        f"Fuel economy: {mpg}. Safety rating: {safety}."
    )


def _comparison(car: dict) -> str:
    competitors = car.get("competitors", [])
    if not competitors:
        comp_str = "no direct competitors listed"
    else:
        comp_str = ", ".join(competitors)
    return (
        f"{car['make']} {car['model']} vs competitors: "
        f"The {car['year']} {car['model']} competes against {comp_str}. "
        f"It offers {car['horsepower']}hp from its {car['engine']} with {car['drivetrain']} drivetrain. "
        f"Key strengths: {', '.join(car.get('pros', [])[:3])}. "
        f"Key weaknesses: {', '.join(car.get('cons', [])[:3])}."
    )


def _enthusiast(car: dict) -> str:
    mods = car.get("common_mods", [])
    mods_str = "; ".join(mods) if mods else "no common mods listed"
    notes = car.get("enthusiast_notes", "")
    return (
        f"Enthusiast notes on {car['year']} {car['make']} {car['model']}: {notes} "
        f"Common modifications: {mods_str}."
    )


def _reliability(car: dict) -> str:
    pros = ", ".join(car.get("pros", []))
    cons = ", ".join(car.get("cons", []))
    return (
        f"{car['year']} {car['make']} {car['model']} reliability: {car.get('reliability', 'unknown')}. "
        f"Pros: {pros}. "
        f"Cons: {cons}."
    )


def _buying_guide(car: dict) -> str:
    pros = ", ".join(car.get("pros", []))
    cons = ", ".join(car.get("cons", []))
    competitors = ", ".join(car.get("competitors", []))
    price = car.get("base_price")
    price_str = f"${price:,}" if price else "price varies"
    return (
        f"Should you buy a {car['year']} {car['make']} {car['model']}? "
        f"Starting at {price_str}, it offers: {pros}. "
        f"Watch out for: {cons}. "
        f"Alternatives to consider: {competitors}. "
        f"Reliability: {car.get('reliability', 'unknown')}."
    )


_CHUNK_BUILDERS = {
    "overview": _overview,
    "specs": _specs,
    "pricing": _pricing,
    "comparison": _comparison,
    "enthusiast": _enthusiast,
    "reliability": _reliability,
    "buying_guide": _buying_guide,
}


def process_car(car: dict) -> list[tuple[str, str, dict]]:
    """Return list of (id, document_text, metadata) tuples for one car."""
    chunks = []
    base_meta = {
        "make": car["make"],
        "model": car["model"],
        "year": str(car.get("year", "")),
        "category": car.get("category", ""),
    }
    for chunk_type, builder in _CHUNK_BUILDERS.items():
        text = builder(car)
        meta = {**base_meta, "chunk_type": chunk_type}
        chunk_id = _chunk_id(car, chunk_type)
        chunks.append((chunk_id, text, meta))
    return chunks


def process_cars(cars: list[dict]) -> list[tuple[str, str, dict]]:
    """Process a list of cars into all chunks."""
    all_chunks = []
    for car in cars:
        all_chunks.extend(process_car(car))
    return all_chunks

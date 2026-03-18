import os
import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from volini.car_knowledge import CarKnowledgeService


class CarKnowledgeServiceTests(unittest.TestCase):

    def setUp(self):
        """Create a fresh in-memory DB for each test."""
        self.svc = CarKnowledgeService(db_path=":memory:")

    def test_store_and_retrieve_profile(self):
        """Stored profile should be retrievable with all fields."""
        self.svc.store_profile(
            "Mazda", "MX-5 Miata",
            msrp_signal="$33,300",
            nhtsa_data={"rating": 5},
        )
        profile = self.svc.get_cached_profile("Mazda", "MX-5 Miata")
        self.assertIsNotNone(profile)
        self.assertEqual(profile["msrp_signal"], "$33,300")
        self.assertEqual(profile["nhtsa_data"], {"rating": 5})
        self.assertIsNone(profile["fuel_economy"])
        self.assertIsNone(profile["specs"])

    def test_cache_freshness(self):
        """A newly stored profile should be fresh."""
        self.svc.store_profile("Toyota", "GR86")
        self.assertTrue(self.svc.is_fresh("Toyota", "GR86"))

    def test_cache_staleness(self):
        """A profile older than 24 hours should not be fresh."""
        # Insert a row with a timestamp 25 hours ago
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
        with self.svc._lock:
            self.svc._conn.execute(
                "INSERT INTO car_profiles (make, model, last_updated) VALUES (?, ?, ?)",
                ("Honda", "Civic", old_ts),
            )
            self.svc._conn.commit()
        self.assertFalse(self.svc.is_fresh("Honda", "Civic"))

    def test_freshness_returns_false_for_missing(self):
        """is_fresh should return False for a make/model not in the DB."""
        self.assertFalse(self.svc.is_fresh("Lamborghini", "Huracan"))

    def test_frequency_increment(self):
        """increment_frequency should start at 1 and increment on subsequent calls."""
        self.svc.increment_frequency("Mazda", "MX-5 Miata")
        self.svc.increment_frequency("Mazda", "MX-5 Miata")
        self.svc.increment_frequency("Mazda", "MX-5 Miata")
        top = self.svc.get_top_cars(n=1)
        self.assertEqual(len(top), 1)
        self.assertEqual(top[0], ("Mazda", "MX-5 Miata"))
        # Verify count is 3
        with self.svc._lock:
            row = self.svc._conn.execute(
                "SELECT query_count FROM query_frequency WHERE make=? AND model=?",
                ("Mazda", "MX-5 Miata")
            ).fetchone()
        self.assertEqual(row[0], 3)

    def test_top_cars_ordering(self):
        """get_top_cars should return cars ordered by query_count DESC."""
        self.svc.increment_frequency("Toyota", "GR86")
        self.svc.increment_frequency("Mazda", "MX-5 Miata")
        self.svc.increment_frequency("Mazda", "MX-5 Miata")
        self.svc.increment_frequency("Porsche", "911")

        top = self.svc.get_top_cars(n=3)
        self.assertEqual(top[0], ("Mazda", "MX-5 Miata"))  # 2 queries
        # Toyota and Porsche are tied at 1 — order between them is unspecified
        makes_in_top = {make for make, _ in top}
        self.assertIn("Toyota", makes_in_top)
        self.assertIn("Porsche", makes_in_top)

    def test_top_cars_limit(self):
        """get_top_cars should respect the n limit."""
        for i in range(5):
            self.svc.increment_frequency(f"Make{i}", f"Model{i}")
        top = self.svc.get_top_cars(n=3)
        self.assertEqual(len(top), 3)

    def test_msrp_brave_env_switching(self):
        """fetch_msrp should use Brave when BRAVE_API_KEY is set, DDG otherwise."""
        # This tests the routing logic without making actual network calls
        import asyncio
        from unittest.mock import AsyncMock, patch

        # Without BRAVE_API_KEY
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("BRAVE_API_KEY", None)
            with patch("volini.car_knowledge.fetch_msrp_duckduckgo", new=AsyncMock(return_value="$30,000")) as mock_ddg:
                with patch("volini.car_knowledge.fetch_msrp_brave", new=AsyncMock(return_value="$29,000")) as mock_brave:
                    from volini.car_knowledge import fetch_msrp
                    result = asyncio.run(fetch_msrp("Toyota", "GR86", 2026))
                    mock_brave.assert_not_called()
                    mock_ddg.assert_called_once()
                    self.assertEqual(result, "$30,000")

        # With BRAVE_API_KEY
        with patch.dict(os.environ, {"BRAVE_API_KEY": "test-key"}):
            with patch("volini.car_knowledge.fetch_msrp_duckduckgo", new=AsyncMock(return_value="$30,000")) as mock_ddg:
                with patch("volini.car_knowledge.fetch_msrp_brave", new=AsyncMock(return_value="$29,000")) as mock_brave:
                    from volini.car_knowledge import fetch_msrp
                    result = asyncio.run(fetch_msrp("Toyota", "GR86", 2026))
                    mock_brave.assert_called_once()
                    mock_ddg.assert_not_called()
                    self.assertEqual(result, "$29,000")

    def tearDown(self):
        self.svc.close()


if __name__ == "__main__":
    unittest.main()

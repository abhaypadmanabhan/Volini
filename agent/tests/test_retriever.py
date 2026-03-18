import unittest
from pathlib import Path
import sys
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from volini.retriever import CarResearchService
from volini.car_knowledge import CarKnowledgeService


class RetrieverTests(unittest.IsolatedAsyncioTestCase):
    async def test_builds_snapshot_with_sources(self) -> None:
        # Create in-memory knowledge service so tests don't touch disk
        knowledge = CarKnowledgeService(db_path=":memory:")

        # Provide a pre-populated profile so no network calls needed
        knowledge.store_profile(
            "Mazda", "MX-5 Miata",
            msrp_signal="$33,300",
        )

        service = CarResearchService(knowledge=knowledge)
        # Patch fetch_full_profile so it returns the pre-stored profile
        # We do this by making is_fresh return True (it will after store_profile)
        answer = await service.answer_question("latest miata price")

        self.assertTrue(answer["sources"])
        self.assertIn("Mazda", answer["summary"])

    async def test_cache_miss_fetches_and_stores(self) -> None:
        knowledge = CarKnowledgeService(db_path=":memory:")
        service = CarResearchService(knowledge=knowledge)

        mock_profile = {
            "nhtsa_data": None,
            "fuel_economy": None,
            "specs": None,
            "msrp_signal": "$35,000",
        }

        with patch("volini.retriever.fetch_full_profile", new=AsyncMock(return_value=mock_profile)):
            answer = await service.answer_question("GR86 price")

        self.assertTrue(answer["topic_allowed"])
        self.assertIn("Toyota", answer["summary"])
        # Verify the profile was stored
        self.assertTrue(knowledge.is_fresh("Toyota", "GR86"))


if __name__ == "__main__":
    unittest.main()

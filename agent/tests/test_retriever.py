import unittest
from pathlib import Path
import sys

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


if __name__ == "__main__":
    unittest.main()

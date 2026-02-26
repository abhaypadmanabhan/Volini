import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from volini.retriever import CarResearchService


class RetrieverTests(unittest.TestCase):
    def test_builds_snapshot_with_sources(self) -> None:
        def fake_json(url: str) -> dict:
            if "GetModelsForMake" in url:
                return {
                    "Results": [
                        {"Model_Name": "MX-5 Miata"},
                        {"Model_Name": "CX-5"},
                    ]
                }
            raise AssertionError(f"Unexpected url: {url}")

        def fake_text(url: str) -> str:
            if "duckduckgo.com" in url:
                return (
                    "2026 Mazda MX-5 Miata MSRP starts at $33,300 and tops near $41,000"
                )
            return ""

        service = CarResearchService(fetch_json=fake_json, fetch_text=fake_text)
        answer = service.answer_question("latest miata price")

        self.assertTrue(answer["sources"])
        self.assertIn("Mazda", answer["summary"])


if __name__ == "__main__":
    unittest.main()

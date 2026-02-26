import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from volini.domain_guard import classify_domain


class DomainGuardTests(unittest.TestCase):
    def test_rejects_non_car_topic(self) -> None:
        verdict = classify_domain("help me cook pasta")
        self.assertFalse(verdict.allowed)

    def test_allows_car_topic(self) -> None:
        verdict = classify_domain("compare miata and civic")
        self.assertTrue(verdict.allowed)


if __name__ == "__main__":
    unittest.main()

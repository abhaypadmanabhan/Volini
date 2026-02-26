import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from volini.entity_resolver import resolve_vehicle


class EntityResolverTests(unittest.TestCase):
    def test_resolves_miata_alias(self) -> None:
        vehicle = resolve_vehicle("latest miata model")
        self.assertIsNotNone(vehicle)
        assert vehicle is not None
        self.assertEqual(vehicle.make, "Mazda")
        self.assertIn("MX-5", vehicle.model)

    def test_resolves_rx5_alias(self) -> None:
        vehicle = resolve_vehicle("master rx5")
        self.assertIsNotNone(vehicle)


if __name__ == "__main__":
    unittest.main()

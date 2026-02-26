import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from volini.voice_style import format_for_speech


class VoiceStyleTests(unittest.TestCase):
    def test_formats_for_natural_speech(self) -> None:
        spoken = format_for_speech("MSRP: $33,700. AWD/MT avail.")
        self.assertNotIn("/", spoken)
        self.assertIn("33,700 dollars", spoken)


if __name__ == "__main__":
    unittest.main()

"""
Smallest.ai Lightning TTS — custom LiveKit TTS wrapper.

Phase 5 swap instructions (when ready to go self-hosted):
1. In agent.py, replace:
       from livekit.plugins import openai as openai_plugin, silero, deepgram
   with:
       from livekit.plugins import openai as openai_plugin, silero, deepgram
       from livekit.agents.tts import StreamAdapter
       from livekit.agents import tokenize
       from volini.smallest_tts import SmallestTTS

2. Replace:
       tts = deepgram.TTS(model="aura-2-andromeda-en", api_key=...)
   with:
       tts = StreamAdapter(
           tts=SmallestTTS(),
           sentence_tokenizer=tokenize.basic.SentenceTokenizer(),
       )

Note: SmallestTTS declares streaming=False, so StreamAdapter is required.
"""

import os

import aiohttp

from livekit.agents import tts, DEFAULT_API_CONNECT_OPTIONS
from volini.voice_style import format_for_speech


class SmallestTTS(tts.TTS):
    def __init__(
        self,
        *,
        voice_id: str = "emily",
        sample_rate: int = 24000,
        speed: float = 1.0,
        api_key: str | None = None,
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=24000,
            num_channels=1,
        )
        self._voice_id = voice_id
        self._speed = speed
        self._api_key = api_key or os.getenv("SMALLEST_API")
        self._url = "https://waves-api.smallest.ai/api/v1/lightning/get_speech"

    def synthesize(
        self, text: str, *, conn_options=DEFAULT_API_CONNECT_OPTIONS
    ) -> "_SmallestStream":
        return _SmallestStream(tts=self, input_text=text, conn_options=conn_options)


class _SmallestStream(tts.ChunkedStream):
    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        text = format_for_speech(self.input_text)
        if not text.strip():
            return

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self._tts._url,
                headers={
                    "Authorization": f"Bearer {self._tts._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "voice_id": self._tts._voice_id,
                    "sample_rate": 24000,
                    "speed": self._tts._speed,
                    "add_wav_header": False,
                },
            ) as resp:
                resp.raise_for_status()
                pcm_bytes = await resp.read()

        # Raw int16 PCM at 24000 Hz mono — no header, push directly
        output_emitter.initialize(
            request_id="smallest-lightning",
            sample_rate=24000,
            num_channels=1,
            mime_type="audio/pcm",
        )
        output_emitter.push(pcm_bytes)
        output_emitter.flush()

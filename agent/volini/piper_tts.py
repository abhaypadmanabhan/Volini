"""Piper TTS LiveKit plugin — stable ONNX-based local TTS."""
from __future__ import annotations
import asyncio
import logging
import os
from typing import Optional

import numpy as np
from livekit.agents import tts
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions
from volini.voice_style import format_for_speech

logger = logging.getLogger(__name__)

SAMPLE_RATE = 22050
NUM_CHANNELS = 1
_AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL_PATH = os.path.join(_AGENT_DIR, "models", "en_US-ryan-high.onnx")


class PiperTTS(tts.TTS):
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._model_path = model_path
        self._voice = None
        self._lock = asyncio.Lock()

    def _load_model_sync(self):
        from piper.voice import PiperVoice  # type: ignore
        logger.info("Loading Piper voice model: %s", self._model_path)
        return PiperVoice.load(self._model_path)

    async def _get_voice(self):
        if self._voice is not None:
            return self._voice
        async with self._lock:
            if self._voice is None:
                loop = asyncio.get_running_loop()
                self._voice = await loop.run_in_executor(None, self._load_model_sync)
        return self._voice

    def synthesize(self, text: str, *, conn_options=DEFAULT_API_CONNECT_OPTIONS):
        return PiperChunkedStream(tts=self, input_text=text, conn_options=conn_options)


class PiperChunkedStream(tts.ChunkedStream):
    def __init__(self, *, tts: PiperTTS, input_text: str, conn_options: APIConnectOptions):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._piper_tts = tts

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        voice = await self._piper_tts._get_voice()
        text = format_for_speech(self.input_text)

        def _synthesize() -> bytes:
            try:
                pcm_parts = []
                for chunk in voice.synthesize(text):
                    audio_int16 = (chunk.audio_float_array * 32767).astype(np.int16)
                    pcm_parts.append(audio_int16.tobytes())
                return b"".join(pcm_parts)
            except Exception as exc:
                logger.exception("Piper synthesis failed: %s", exc)
                raise

        loop = asyncio.get_running_loop()
        pcm_bytes = await loop.run_in_executor(None, _synthesize)

        output_emitter.initialize(
            request_id="piper-local",
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
            mime_type="audio/pcm",
        )
        output_emitter.push(pcm_bytes)
        output_emitter.flush()

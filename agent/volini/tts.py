# agent/volini/tts.py
"""Local kokoro-onnx TTS plugin for livekit-agents."""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import numpy as np

from livekit.agents import tts
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions

logger = logging.getLogger(__name__)

SAMPLE_RATE = 24000
NUM_CHANNELS = 1

_AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL_PATH = os.path.join(_AGENT_DIR, "models", "kokoro-v1.0.onnx")
DEFAULT_VOICES_PATH = os.path.join(_AGENT_DIR, "models", "voices-v1.0.bin")


class KokoroTTS(tts.TTS):
    def __init__(
        self,
        *,
        voice: str = "am_michael",
        speed: float = 1.0,
        lang: str = "en-us",
        model_path: str = DEFAULT_MODEL_PATH,
        voices_path: str = DEFAULT_VOICES_PATH,
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._voice = voice
        self._speed = speed
        self._lang = lang
        self._model_path = model_path
        self._voices_path = voices_path
        self._kokoro: Optional[object] = None
        self._lock = asyncio.Lock()

    def _load_model_sync(self) -> object:
        from kokoro_onnx import Kokoro  # type: ignore
        logger.info("Loading kokoro-onnx model from %s", self._model_path)
        return Kokoro(self._model_path, self._voices_path)

    async def _get_kokoro(self) -> object:
        if self._kokoro is not None:
            return self._kokoro
        async with self._lock:
            if self._kokoro is None:
                loop = asyncio.get_running_loop()
                self._kokoro = await loop.run_in_executor(None, self._load_model_sync)
        return self._kokoro

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "KokoroChunkedStream":
        return KokoroChunkedStream(tts=self, input_text=text, conn_options=conn_options)


class KokoroChunkedStream(tts.ChunkedStream):
    def __init__(self, *, tts: KokoroTTS, input_text: str, conn_options: APIConnectOptions) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._kokoro_tts: KokoroTTS = tts

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        kokoro = await self._kokoro_tts._get_kokoro()
        voice = self._kokoro_tts._voice
        speed = self._kokoro_tts._speed
        lang = self._kokoro_tts._lang
        text = self.input_text

        def _synthesize() -> bytes:
            try:
                samples, _ = kokoro.create(  # type: ignore
                    text,
                    voice=voice,
                    speed=speed,
                    lang=lang,
                )
                pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
                return pcm.tobytes()
            except Exception as exc:
                logger.exception("kokoro synthesis failed: %s", exc)
                raise

        loop = asyncio.get_running_loop()
        pcm_bytes = await loop.run_in_executor(None, _synthesize)

        output_emitter.initialize(
            request_id="kokoro-local",
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
            mime_type="audio/pcm",
        )
        output_emitter.push(pcm_bytes)
        output_emitter.flush()

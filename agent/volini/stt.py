"""Local faster-whisper STT plugin for livekit-agents."""

from __future__ import annotations

import asyncio
import io
import logging
from typing import Optional

from livekit import rtc
from livekit.agents import stt
from livekit.agents.types import (
    DEFAULT_API_CONNECT_OPTIONS,
    NOT_GIVEN,
    APIConnectOptions,
    NotGivenOr,
)
from livekit.agents.utils import AudioBuffer

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "small.en"


class WhisperSTT(stt.STT):
    """Batch STT using faster-whisper running fully local (no API calls)."""

    def __init__(
        self,
        *,
        model: str = DEFAULT_MODEL,
        language: str = "en",
        beam_size: int = 1,
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        super().__init__(
            capabilities=stt.STTCapabilities(
                streaming=False,
                interim_results=False,
            )
        )
        self._model_name = model
        self._language = language
        self._beam_size = beam_size
        self._device = device
        self._compute_type = compute_type
        self._whisper: Optional[object] = None
        self._lock = asyncio.Lock()

    def _load_model_sync(self) -> object:
        from faster_whisper import WhisperModel  # type: ignore

        logger.info("Loading faster-whisper model: %s", self._model_name)
        return WhisperModel(
            self._model_name,
            device=self._device,
            compute_type=self._compute_type,
        )

    async def _get_model(self) -> object:
        if self._whisper is not None:
            return self._whisper
        async with self._lock:
            if self._whisper is None:
                loop = asyncio.get_running_loop()
                self._whisper = await loop.run_in_executor(None, self._load_model_sync)
        return self._whisper

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> stt.SpeechEvent:
        model = await self._get_model()
        lang = language if language is not NOT_GIVEN else self._language

        wav_bytes = rtc.combine_audio_frames(buffer).to_wav_bytes()
        audio_io = io.BytesIO(wav_bytes)
        beam = self._beam_size

        def _transcribe() -> tuple[str, str]:
            try:
                segments, info = model.transcribe(  # type: ignore
                    audio_io,
                    language=lang or None,
                    beam_size=beam,
                    vad_filter=False,
                    condition_on_previous_text=False,
                )
                text = " ".join(seg.text for seg in segments).strip()
                detected = info.language or lang or "en"
                return text, detected
            except Exception as exc:
                logger.exception("faster-whisper transcription failed: %s", exc)
                raise

        loop = asyncio.get_running_loop()
        text, detected_lang = await loop.run_in_executor(None, _transcribe)

        logger.debug("WhisperSTT transcript: %r", text)
        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    language=detected_lang,
                    text=text,
                    confidence=1.0,
                )
            ],
        )

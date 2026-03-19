"""Qwen3-TTS-0.6B LiveKit TTS plugin (MPS / CPU)."""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import numpy as np

from livekit.agents import tts
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions
from volini.voice_style import format_for_speech

logger = logging.getLogger(__name__)

SAMPLE_RATE = 24000
NUM_CHANNELS = 1
MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"

VOLINI_VOICE = (
    "Energetic, enthusiastic male car-enthusiast host. "
    "Fast-paced delivery with genuine excitement. "
    "Clear American English accent. Natural conversational tone."
)


class QwenTTS(tts.TTS):
    def __init__(
        self,
        voice_description: str = VOLINI_VOICE,
        device: Optional[str] = None,
        temperature: float = 0.5,
        seed: int = 42,
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._voice_description = voice_description
        self._device = device  # None = auto-detect
        self._temperature = temperature
        self._seed = seed
        self._model: Optional[object] = None
        self._lock = asyncio.Lock()

    def update_config(
        self,
        voice_description: Optional[str] = None,
        temperature: Optional[float] = None,
        seed: Optional[int] = None,
    ) -> None:
        if voice_description is not None:
            self._voice_description = voice_description
        if temperature is not None:
            self._temperature = temperature
        if seed is not None:
            self._seed = seed

    def _load_model_sync(self) -> object:
        import torch
        from qwen_tts.inference.qwen3_tts_model import Qwen3TTSModel  # type: ignore

        if self._device is not None:
            device = self._device
        elif torch.backends.mps.is_available():
            device = "mps"
            logger.info("QwenTTS: using MPS (Apple Silicon)")
        else:
            device = "cpu"
            logger.warning("QwenTTS: MPS not available, falling back to CPU (slower)")

        logger.warning(
            "QwenTTS: first synthesis will trigger a ~1.2 GB model download from HuggingFace — please wait"
        )
        model = Qwen3TTSModel.from_pretrained(
            MODEL_ID,
            device_map=device,
            torch_dtype=torch.bfloat16,
            # flash_attention_2 is NOT supported on MPS — omit attn_implementation
        )
        logger.info("QwenTTS: model loaded on %s", device)
        return model

    async def _get_model(self) -> object:
        if self._model is not None:
            return self._model
        async with self._lock:
            if self._model is None:
                loop = asyncio.get_running_loop()
                self._model = await loop.run_in_executor(None, self._load_model_sync)
        return self._model

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "QwenChunkedStream":
        return QwenChunkedStream(tts=self, input_text=text, conn_options=conn_options)


class QwenChunkedStream(tts.ChunkedStream):
    def __init__(self, *, tts: QwenTTS, input_text: str, conn_options: APIConnectOptions) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._qwen_tts: QwenTTS = tts

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        model = await self._qwen_tts._get_model()
        text = format_for_speech(self.input_text)
        instruct = self._qwen_tts._voice_description

        def _synthesize() -> bytes:
            try:
                import torch
                torch.manual_seed(self._qwen_tts._seed)
                if torch.backends.mps.is_available():
                    torch.mps.manual_seed(self._qwen_tts._seed)

                wavs, sr = model.generate_voice_design(  # type: ignore
                    text=text,
                    instruct=instruct,
                    language="english",
                    temperature=self._qwen_tts._temperature,
                    do_sample=True,
                )
                wav = wavs[0]  # np.ndarray float32

                # Resample if model returns a different sample rate
                if sr != SAMPLE_RATE:
                    from scipy.signal import resample_poly  # type: ignore
                    import math
                    gcd = math.gcd(SAMPLE_RATE, sr)
                    wav = resample_poly(wav, SAMPLE_RATE // gcd, sr // gcd).astype(np.float32)

                pcm = (np.clip(wav, -1.0, 1.0) * 32767).astype(np.int16)
                result = pcm.tobytes()

                if torch.backends.mps.is_available():
                    torch.mps.empty_cache()

                return result
            except Exception as exc:
                logger.exception("QwenTTS synthesis failed: %s", exc)
                raise

        loop = asyncio.get_running_loop()
        pcm_bytes = await loop.run_in_executor(None, _synthesize)

        output_emitter.initialize(
            request_id="qwen-tts-local",
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
            mime_type="audio/pcm",
        )
        output_emitter.push(pcm_bytes)
        output_emitter.flush()

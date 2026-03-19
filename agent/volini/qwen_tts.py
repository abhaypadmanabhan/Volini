"""Qwen3-TTS-0.6B LiveKit TTS plugin (MLX / Apple Silicon)."""

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
# MLX-community bfloat16 weights — no NaN issues, 2× faster than float32 on MPS
MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-bf16"
DEFAULT_SPEAKER = "Ryan"       # Dynamic male voice, strong rhythmic drive — English native
VOLINI_INSTRUCT = (            # Short style hint; keeps context shorter than VoiceDesign
    "Speak with car-enthusiast energy. Fast-paced, direct American English."
)


class QwenTTS(tts.TTS):
    def __init__(
        self,
        speaker: str = DEFAULT_SPEAKER,
        instruct: str = VOLINI_INSTRUCT,
        device: Optional[str] = None,  # kept for API compat, unused by MLX
        temperature: float = 0.5,
        seed: int = 42,
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._speaker = speaker
        self._instruct = instruct
        self._temperature = temperature
        self._seed = seed
        self._model: Optional[object] = None
        self._lock = asyncio.Lock()

    def update_config(
        self,
        speaker: Optional[str] = None,
        instruct: Optional[str] = None,
        temperature: Optional[float] = None,
        seed: Optional[int] = None,
    ) -> None:
        if speaker is not None:
            self._speaker = speaker
        if instruct is not None:
            self._instruct = instruct
        if temperature is not None:
            self._temperature = temperature
        if seed is not None:
            self._seed = seed

    def _load_model_sync(self) -> object:
        from mlx_audio.tts.utils import load  # type: ignore

        logger.warning(
            "QwenTTS: first synthesis will trigger a model download from HuggingFace — please wait"
        )
        model = load(MODEL_ID)
        logger.info("QwenTTS: MLX model loaded (speaker=%s)", self._speaker)
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

        def _synthesize() -> bytes:
            try:
                import mlx.core as mx  # type: ignore

                # Collect all audio segments from the generator
                audio_parts: list[np.ndarray] = []
                for result in model.generate(  # type: ignore
                    text=text,
                    voice=self._qwen_tts._speaker,
                    instruct=self._qwen_tts._instruct,
                    lang_code="english",
                    temperature=self._qwen_tts._temperature,
                    top_k=50,
                    top_p=1.0,
                    repetition_penalty=1.05,
                ):
                    # Ensure MLX computation is complete before converting
                    mx.eval(result.audio)
                    audio_np = np.array(result.audio, dtype=np.float32)
                    if audio_np.ndim > 1:
                        audio_np = audio_np.flatten()
                    audio_parts.append(audio_np)

                if not audio_parts:
                    logger.warning("QwenTTS: no audio generated")
                    return b""

                wav = np.concatenate(audio_parts)

                # Resample if model returns a different sample rate
                result_sr = getattr(result, "sample_rate", SAMPLE_RATE)
                if result_sr != SAMPLE_RATE:
                    import math
                    from scipy.signal import resample_poly  # type: ignore
                    gcd = math.gcd(SAMPLE_RATE, result_sr)
                    wav = resample_poly(wav, SAMPLE_RATE // gcd, result_sr // gcd).astype(np.float32)

                pcm = (np.clip(wav, -1.0, 1.0) * 32767).astype(np.int16)
                return pcm.tobytes()
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

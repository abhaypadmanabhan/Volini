# Local Voice Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace paid OpenAI STT and TTS with free local alternatives (faster-whisper + kokoro-onnx), remove the redundant car_topic_guard tool, expand vehicle knowledge, and add NHTSA caching — all while keeping LLM as the only paid API call.

**Architecture:** The Python agent currently calls OpenAI STT (REST, ~530ms) and OpenAI TTS (~400ms). We replace STT with `faster-whisper` (local, CPU/int8, ~150ms) and TTS with `kokoro-onnx` (local ONNX, ~100ms). Both are wrapped as drop-in livekit-agents plugins inside `agent/volini/stt.py` and `agent/volini/tts.py`. The `car_topic_guard` function_tool is deleted since the system prompt already enforces topic restriction and the tool costs one extra LLM roundtrip. NHTSA results are cached in-process with `functools.lru_cache`.

**Tech Stack:** Python 3.12, livekit-agents 1.4.2, faster-whisper 1.2.1, kokoro-onnx 0.5.0, onnxruntime, soundfile, numpy (already transitive dep), Next.js 16

---

## Task 1: Remove car_topic_guard tool

The `car_topic_guard` @function_tool causes the LLM to make an extra tool-call roundtrip on ambiguous turns. The system prompt already says "Refuse non-car topics with one short sentence." The `classify_domain` logic still runs inside `retriever.py` before any web call, so domain safety is preserved.

**Files:**
- Modify: `agent/agent.py`

**Step 1: Delete the car_topic_guard method from Assistant**

Remove these lines from `agent/agent.py` (the entire method):

```python
    @function_tool
    async def car_topic_guard(self, question: str) -> str:
        """Validate if the user request is in the car domain."""
        verdict = classify_domain(question)
        return json.dumps(
            {
                "allowed": verdict.allowed,
                "reason": verdict.reason,
                "redirect_message": verdict.redirect_message,
            }
        )
```

Also remove the now-unused import at the top:
```python
from volini.domain_guard import classify_domain
```

**Step 2: Verify agent.py still imports correctly**

Run:
```bash
agent/venv/bin/python -c "import agent.agent" 2>&1
```
Expected: no output (no import errors).

**Step 3: Commit**

```bash
git add agent/agent.py
git commit -m "perf: remove car_topic_guard tool to eliminate extra LLM roundtrip"
```

---

## Task 2: Expand entity resolver + cache NHTSA results

The entity resolver only knows 6 cars. We expand it by fetching the full NHTSA makes list at module load time (~800 makes), enabling the resolver to handle any car brand by name. We also add `lru_cache` to stop re-fetching NHTSA on every `lookup_car_details` call.

**Files:**
- Modify: `agent/volini/entity_resolver.py`
- Modify: `agent/volini/retriever.py`

**Step 1: Update entity_resolver.py**

Replace the entire file with:

```python
from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
import re
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
import json
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class VehicleMatch:
    make: str
    model: str
    alias: str
    score: float


# Hard-coded common aliases (spoken name → make, model)
_ALIASES: dict[str, tuple[str, str]] = {
    "miata": ("Mazda", "MX-5 Miata"),
    "mx5": ("Mazda", "MX-5 Miata"),
    "mx-5": ("Mazda", "MX-5 Miata"),
    "rx5": ("Mazda", "RX-5"),
    "rx-5": ("Mazda", "RX-5"),
    "civic": ("Honda", "Civic"),
    "corolla": ("Toyota", "Corolla"),
    "camry": ("Toyota", "Camry"),
    "model 3": ("Tesla", "Model 3"),
    "model s": ("Tesla", "Model S"),
    "model x": ("Tesla", "Model X"),
    "model y": ("Tesla", "Model Y"),
    "mustang": ("Ford", "Mustang"),
    "f150": ("Ford", "F-150"),
    "f-150": ("Ford", "F-150"),
    "silverado": ("Chevrolet", "Silverado"),
    "malibu": ("Chevrolet", "Malibu"),
    "accord": ("Honda", "Accord"),
    "altima": ("Nissan", "Altima"),
    "maxima": ("Nissan", "Maxima"),
    "rogue": ("Nissan", "Rogue"),
    "3 series": ("BMW", "3 Series"),
    "5 series": ("BMW", "5 Series"),
    "m3": ("BMW", "M3"),
    "m5": ("BMW", "M5"),
    "c class": ("Mercedes-Benz", "C-Class"),
    "e class": ("Mercedes-Benz", "E-Class"),
    "a4": ("Audi", "A4"),
    "a6": ("Audi", "A6"),
    "q5": ("Audi", "Q5"),
    "wrangler": ("Jeep", "Wrangler"),
    "cherokee": ("Jeep", "Cherokee"),
    "911": ("Porsche", "911"),
    "cayenne": ("Porsche", "Cayenne"),
    "rav4": ("Toyota", "RAV4"),
    "highlander": ("Toyota", "Highlander"),
    "tacoma": ("Toyota", "Tacoma"),
    "tundra": ("Toyota", "Tundra"),
    "cr-v": ("Honda", "CR-V"),
    "crv": ("Honda", "CR-V"),
    "pilot": ("Honda", "Pilot"),
    "prius": ("Toyota", "Prius"),
}

# NHTSA makes list — fetched once at module load, used for brand recognition
_NHTSA_MAKES: list[str] = []


def _load_nhtsa_makes() -> None:
    """Fetch all vehicle makes from NHTSA. Runs once at import time."""
    global _NHTSA_MAKES
    try:
        url = "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json"
        req = Request(url, headers={"User-Agent": "Volini/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        _NHTSA_MAKES = [
            item["Make_Name"].strip()
            for item in data.get("Results", [])
            if item.get("Make_Name")
        ]
        logger.info("Loaded %d NHTSA makes", len(_NHTSA_MAKES))
    except Exception as e:
        logger.warning("Could not load NHTSA makes: %s", e)
        _NHTSA_MAKES = []


_load_nhtsa_makes()


def _normalize(text: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s-]", " ", text.lower())
    return re.sub(r"\s+", " ", normalized).strip()


def resolve_vehicle(text: str) -> VehicleMatch | None:
    normalized = _normalize(text)

    # 1. Exact alias match (handles spoken names like "miata", "f-150")
    for alias, (make, model) in _ALIASES.items():
        if alias in normalized:
            return VehicleMatch(make=make, model=model, alias=alias, score=1.0)

    # 2. Fuzzy alias match
    best_alias, best_score = "", 0.0
    for alias in _ALIASES:
        score = SequenceMatcher(a=alias, b=normalized).ratio()
        if score > best_score:
            best_alias, best_score = alias, score
    if best_score >= 0.55:
        make, model = _ALIASES[best_alias]
        return VehicleMatch(make=make, model=model, alias=best_alias, score=best_score)

    # 3. NHTSA make scan — if any official make name appears in the query,
    #    return a make-only match so retriever can look up models
    for make in _NHTSA_MAKES:
        if make.lower() in normalized:
            return VehicleMatch(make=make, model="", alias=make.lower(), score=0.8)

    return None
```

**Step 2: Add lru_cache to NHTSA fetches in retriever.py**

Replace the two fetch methods:

```python
# Add at top of file, after existing imports:
import functools

# Replace _fetch_nhtsa_models with a cached version.
# Note: lru_cache requires hashable args, str qualifies.
@functools.lru_cache(maxsize=256)
def _cached_nhtsa_models(make: str, fetch_json_id: int) -> tuple[str, ...]:
    """Cached NHTSA model list per make. fetch_json_id is ignored but
    makes the signature unique per CarResearchService instance."""
    raise NotImplementedError  # overridden per-instance below
```

Actually, `lru_cache` on an instance method is awkward. Use a module-level cache dict instead. Replace `_fetch_nhtsa_models` in `retriever.py` with:

```python
_nhtsa_cache: dict[str, list[str]] = {}

def _fetch_nhtsa_models(self, make: str) -> list[str]:
    if make in _nhtsa_cache:
        return _nhtsa_cache[make]
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/{quote_plus(make)}?format=json"
    payload = self._fetch_json(url)
    models = [item.get("Model_Name", "") for item in payload.get("Results", []) if item.get("Model_Name")]
    _nhtsa_cache[make] = models
    return models
```

Add `_nhtsa_cache: dict[str, list[str]] = {}` as a module-level variable at the top of `retriever.py` (after imports).

**Step 3: Handle make-only VehicleMatch (empty model)**

In `retriever.py`, `answer_question` currently calls `self._pick_model_name(vehicle, models)` which works fine even when `vehicle.model == ""` — it will just return `""` and the summary will say "For Toyota , the newest...". Fix this:

In `answer_question`, after `models = self._fetch_nhtsa_models(vehicle.make)`:

```python
model_hint = self._pick_model_name(vehicle, models) if vehicle.model else (models[0] if models else "")
```

**Step 4: Verify**

```bash
agent/venv/bin/python -c "
from volini.entity_resolver import resolve_vehicle
assert resolve_vehicle('what is the price of a BMW M3') is not None
assert resolve_vehicle('tell me about the Toyota RAV4') is not None
assert resolve_vehicle('honda accord specs') is not None
print('entity resolver OK')
"
```
Expected: `entity resolver OK`

**Step 5: Commit**

```bash
git add agent/volini/entity_resolver.py agent/volini/retriever.py
git commit -m "feat: expand entity resolver to 40+ aliases + NHTSA make scan + NHTSA result cache"
```

---

## Task 3: Install dependencies + download kokoro model files

**Step 1: Install faster-whisper and kokoro-onnx into venv**

```bash
agent/venv/bin/pip install faster-whisper==1.2.1 kokoro-onnx==0.5.0 soundfile
```

Expected: successful installs. faster-whisper pulls in ctranslate2 and onnxruntime.

**Step 2: Create models directory**

```bash
mkdir -p agent/models
```

**Step 3: Download kokoro model files**

```bash
curl -L -o agent/models/kokoro-v1.0.onnx \
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx

curl -L -o agent/models/voices-v1.0.bin \
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

These files are ~310MB and ~50MB respectively. Download once, used forever.

**Step 4: Add models/ to .gitignore**

```bash
echo "agent/models/" >> .gitignore
```

**Step 5: Verify both packages import**

```bash
agent/venv/bin/python -c "
from faster_whisper import WhisperModel
from kokoro_onnx import Kokoro
print('imports OK')
"
```
Expected: `imports OK`

---

## Task 4: Create faster-whisper STT plugin

**Files:**
- Create: `agent/volini/stt.py`

**Step 1: Write the plugin**

```python
# agent/volini/stt.py
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

# faster-whisper model sizes: tiny.en (~40MB), small.en (~240MB), medium.en (~770MB)
# tiny.en: ~120ms, good enough for car domain queries
# small.en: ~250ms, noticeably better accuracy
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
        """Load WhisperModel synchronously. Called from executor."""
        from faster_whisper import WhisperModel  # type: ignore

        logger.info("Loading faster-whisper model: %s", self._model_name)
        return WhisperModel(
            self._model_name,
            device=self._device,
            compute_type=self._compute_type,
        )

    async def _get_model(self) -> object:
        """Return the WhisperModel, loading it on first use."""
        if self._whisper is not None:
            return self._whisper
        async with self._lock:
            if self._whisper is None:
                loop = asyncio.get_event_loop()
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
        lang = language if language is not NOT_GIVEN else self._language  # type: ignore

        # Combine frames → WAV bytes (int16 PCM with WAV header)
        wav_bytes = rtc.combine_audio_frames(buffer).to_wav_bytes()
        audio_io = io.BytesIO(wav_bytes)
        beam = self._beam_size

        def _transcribe() -> tuple[str, str]:
            segments, info = model.transcribe(  # type: ignore
                audio_io,
                language=lang or None,
                beam_size=beam,
                vad_filter=False,   # Silero VAD already handled this upstream
                condition_on_previous_text=False,
            )
            text = " ".join(seg.text for seg in segments).strip()
            detected = info.language or lang or "en"
            return text, detected

        loop = asyncio.get_event_loop()
        text, detected_lang = await loop.run_in_executor(None, _transcribe)

        logger.debug("WhisperSTT transcript: %r", text)
        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=text,
                    language=detected_lang,
                    confidence=1.0,
                )
            ],
        )
```

**Step 2: Verify the plugin loads**

```bash
agent/venv/bin/python -c "
from volini.stt import WhisperSTT
s = WhisperSTT()
print('WhisperSTT OK, model:', s._model_name)
"
```
Expected: `WhisperSTT OK, model: small.en`

**Step 3: Commit**

```bash
git add agent/volini/stt.py
git commit -m "feat: add faster-whisper local STT plugin"
```

---

## Task 5: Create kokoro-onnx TTS plugin

**Files:**
- Create: `agent/volini/tts.py`

**Step 1: Write the plugin**

```python
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

# Paths to model files (relative to agent/ directory, resolved at import time)
_AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL_PATH = os.path.join(_AGENT_DIR, "models", "kokoro-v1.0.onnx")
DEFAULT_VOICES_PATH = os.path.join(_AGENT_DIR, "models", "voices-v1.0.bin")


class KokoroTTS(tts.TTS):
    """Local TTS using kokoro-onnx. No API calls — fully offline."""

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

    @property
    def model(self) -> str:
        return "kokoro-v1.0"

    @property
    def provider(self) -> str:
        return "local"

    def _load_model_sync(self) -> object:
        """Load Kokoro model synchronously. Called from executor."""
        from kokoro_onnx import Kokoro  # type: ignore

        logger.info("Loading kokoro-onnx model from %s", self._model_path)
        return Kokoro(self._model_path, self._voices_path)

    async def _get_kokoro(self) -> object:
        """Return the Kokoro instance, loading on first use."""
        if self._kokoro is not None:
            return self._kokoro
        async with self._lock:
            if self._kokoro is None:
                loop = asyncio.get_event_loop()
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
            samples, _ = kokoro.create(  # type: ignore
                text,
                voice=voice,
                speed=speed,
                lang=lang,
            )
            # samples is float32 in [-1, 1]; convert to int16 PCM
            pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
            return pcm.tobytes()

        loop = asyncio.get_event_loop()
        pcm_bytes = await loop.run_in_executor(None, _synthesize)

        output_emitter.initialize(
            request_id="kokoro-local",
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
            mime_type="audio/pcm",
        )
        output_emitter.push(pcm_bytes)
        output_emitter.flush()
```

**Step 2: Verify model files exist and plugin imports**

```bash
ls -lh agent/models/
agent/venv/bin/python -c "
from volini.tts import KokoroTTS
t = KokoroTTS()
print('KokoroTTS OK, voice:', t._voice)
"
```
Expected: both model files listed, `KokoroTTS OK, voice: am_michael`

**Step 3: Smoke-test synthesis (run this once to confirm audio is generated)**

```bash
agent/venv/bin/python -c "
import asyncio, numpy as np, soundfile as sf
from volini.tts import KokoroTTS

async def test():
    t = KokoroTTS(voice='am_michael')
    kokoro = await t._get_kokoro()
    samples, sr = kokoro.create('Hello, I am Volini, your car specialist.', voice='am_michael', speed=1.0, lang='en-us')
    sf.write('/tmp/test_tts.wav', samples, sr)
    print(f'Audio OK: {len(samples)/sr:.1f}s at {sr}Hz -> /tmp/test_tts.wav')

asyncio.run(test())
" && afplay /tmp/test_tts.wav
```
Expected: audio plays and you hear Volini's greeting.

**Step 4: Commit**

```bash
git add agent/volini/tts.py
git commit -m "feat: add kokoro-onnx local TTS plugin"
```

---

## Task 6: Wire new plugins into agent.py

**Files:**
- Modify: `agent/agent.py`

**Step 1: Replace STT and TTS in AgentSession**

Change the imports at the top:

```python
# Add local plugin imports
from volini.stt import WhisperSTT
from volini.tts import KokoroTTS
```

Replace the `AgentSession(...)` block:

```python
    session = AgentSession(
        stt=WhisperSTT(model="small.en", language="en"),
        llm=openai.LLM(model="gpt-4.1-mini", temperature=0.3),
        tts=KokoroTTS(voice="am_michael", speed=1.0),
        vad=silero.VAD.load(min_silence_duration=0.2),
    )
```

**Step 2: Remove the `openai` TTS/STT imports if no longer needed**

Check if `openai` plugin is still used for LLM (it is — `openai.LLM`). Keep the import. Only the `openai.STT` and `openai.TTS` calls are removed — the import line stays because of `openai.LLM`.

**Step 3: Verify agent.py syntax**

```bash
agent/venv/bin/python -c "
import ast, pathlib
src = pathlib.Path('agent/agent.py').read_text()
ast.parse(src)
print('Syntax OK')
"
```
Expected: `Syntax OK`

**Step 4: Commit**

```bash
git add agent/agent.py
git commit -m "feat: wire faster-whisper STT + kokoro TTS into AgentSession"
```

---

## Task 7: Update MetricsPanel config + run full integration test

**Files:**
- Modify: `components/MetricsPanel.tsx`

**Step 1: Update static config labels**

In `components/MetricsPanel.tsx`, update `AGENT_CONFIG`:

```typescript
const AGENT_CONFIG = [
    { label: "VAD", value: "Silero (local)" },
    { label: "Speech-to-Text", value: "faster-whisper / small.en (local)" },
    { label: "LLM", value: "OpenAI / gpt-4.1-mini" },
    { label: "Text-to-Speech", value: "kokoro-onnx / am_michael (local)" },
    { label: "Turn Detection", value: "True" },
    { label: "Noise Cancellation", value: "False" },
];
```

**Step 2: TypeScript check**

```bash
npx tsc -p tsconfig.json --noEmit
```
Expected: no output (clean).

**Step 3: Full integration test**

Terminal 1:
```bash
agent/venv/bin/python agent/agent.py dev
```

Watch for:
- `Loading faster-whisper model: small.en` on first STT use
- `Loading kokoro-onnx model from .../models/kokoro-v1.0.onnx` on startup greeting
- No errors or tracebacks

Terminal 2:
```bash
npm run dev
```

Open http://localhost:3000, click "Wake up Volini", ask "what is the price of a BMW M3?"

Expected results:
- Agent responds in voice (kokoro audio)
- Metrics panel shows STT < 300ms, TTS < 200ms, Overall < 1500ms
- No Python errors in agent terminal

**Step 4: Commit**

```bash
git add components/MetricsPanel.tsx
git commit -m "chore: update MetricsPanel config to reflect local STT/TTS stack"
```

---

## Expected Latency After All Tasks

| Phase | Before | After | Saving |
|-------|--------|-------|--------|
| STT | ~530ms | ~150ms | −380ms |
| EOT | ~530ms | ~180ms | −350ms |
| LLM | ~700ms | ~700ms | — |
| TTS | ~400ms | ~120ms | −280ms |
| **Overall** | **~2100ms** | **~1150ms** | **−950ms** |

## Cost After All Tasks

| Component | Before | After |
|-----------|--------|-------|
| STT | ~$0.006/min | $0 |
| TTS | ~$0.015/1K chars | $0 |
| LLM | paid | paid (unchanged) |
| Infrastructure | LiveKit Cloud | LiveKit Cloud |

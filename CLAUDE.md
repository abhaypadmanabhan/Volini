# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Volini is a voice assistant specialized in cars. It is a two-process system:

1. **Next.js web app** — user joins a LiveKit room and sees voice-assistant UX
2. **Python LiveKit Agent** — a separate process that connects to the same LiveKit room and runs the voice pipeline (STT → LLM → TTS)

The two processes communicate only through LiveKit. The Next.js app has no direct connection to the Python agent.

## Commands

### Web app (Next.js)

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm run lint -- --fix  # autofix lint
npx tsc -p tsconfig.json --noEmit  # type check (no dedicated script)
```

### Python agent

```bash
# Run in dev mode (with auto-reload)
agent/venv/bin/python agent/agent.py dev

# Or activate the venv first
source agent/venv/bin/activate && python agent/agent.py dev
```

The repo ships a checked-in virtualenv at `agent/venv` (Python 3.12). No `pip install` needed unless adding packages.

### Running tests (Python)

```bash
# Run all agent tests
agent/venv/bin/python -m pytest agent/tests/

# Run a single test file
agent/venv/bin/python -m unittest agent/tests/test_retriever.py
```

Tests use `unittest` and inject fakes for external HTTP calls (`fetch_json`, `fetch_text` params on `CarResearchService`). There is no test runner configured for the Next.js side.

### Local end-to-end development (two terminals)

```bash
# Terminal 1
agent/venv/bin/python agent/agent.py dev

# Terminal 2
npm run dev
```

Then open http://localhost:3000 and click "Wake up Volini".

## Environment Variables

**`.env.local`** (Next.js):
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

**`agent/.env`** (Python):
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`

## Architecture

### Request flow

1. User clicks "Wake up Volini" → `app/page.tsx` calls `GET /api/token`
2. `app/api/token/route.ts` mints a LiveKit JWT for the hard-coded room `volini-room` and returns it with `LIVEKIT_URL`
3. `app/page.tsx` creates a `<LiveKitRoom>` and renders `components/AssistantInterface.tsx`
4. `AssistantInterface` uses `useVoiceAssistant()` from `@livekit/components-react` for state, audio track, and mic toggle
5. The Python agent (`agent/agent.py`) independently connects to the same `volini-room` and handles the full voice pipeline

### Python agent internals (`agent/`)

- **`agent.py`** — entry point; wires `AgentSession` with OpenAI STT/LLM/TTS + Silero VAD; defines `Assistant(Agent)` with two `@function_tool`s: `lookup_car_details` and `car_topic_guard`
- **`volini/retriever.py`** — `CarResearchService.answer_question()`: domain-guards the query, resolves a vehicle, hits NHTSA API for models, scrapes DuckDuckGo for MSRP signals, and formats results for speech
- **`volini/entity_resolver.py`** — fuzzy alias lookup (e.g. "miata" → Mazda MX-5 Miata). Extend `_ALIASES` to support more vehicles
- **`volini/domain_guard.py`** — keyword + entity check to classify whether a question is car-related
- **`volini/voice_style.py`** — post-processes text before TTS: expands abbreviations (MSRP → price, AWD → all wheel drive), converts `$33,000` → `33,000 dollars`

### Adding a new vehicle

Add an entry to `_ALIASES` in `agent/volini/entity_resolver.py`. The key is a spoken alias (lowercase); the value is `(Make, Model)`.

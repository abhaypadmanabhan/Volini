# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

### Web app (Next.js)

- Install JS deps:
  - `npm install`
- Run dev server (http://localhost:3000):
  - `npm run dev`
- Production build / run:
  - `npm run build`
  - `npm start`
- Lint:
  - `npm run lint`
  - Autofix: `npm run lint -- --fix`
- Typecheck (no dedicated script in `package.json`):
  - `npx tsc -p tsconfig.json --noEmit`

There is currently no test runner configured in `package.json` (no `test` script).

### Voice agent (Python / LiveKit Agents)

The agent lives in `agent/agent.py` and is invoked via the LiveKit Agents CLI.

- Run the agent in dev mode (uses env vars; see below):
  - `agent/venv/bin/python agent/agent.py dev`
- Show agent CLI help:
  - `agent/venv/bin/python agent/agent.py --help`

Notes:
- The repo includes a checked-in virtualenv at `agent/venv` (created with Python 3.12).
- If you prefer activation instead of calling the venv interpreter directly:
  - `source agent/venv/bin/activate && python agent/agent.py dev`

### End-to-end local development

You typically need **two terminals**:

1) Start the agent:
   - `agent/venv/bin/python agent/agent.py dev`
2) Start the Next.js dev server:
   - `npm run dev`

Then open http://localhost:3000 and use the “Wake up Volini” button to join the LiveKit room.

## Environment variables

Both the Next.js app and the Python agent expect LiveKit credentials.

- Next.js server route `app/api/token/route.ts` requires:
  - `LIVEKIT_URL`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
- Python agent `agent/agent.py` additionally requires:
  - `OPENAI_API_KEY`

In local development, these are typically provided via `.env.local` (Next.js) and `agent/.env` (Python). `.env*` files are gitignored by default (see `.gitignore`).

## Architecture (big picture)

This repo is a small two-process system:

1) **Next.js UI (App Router)**: a client joins a LiveKit room and renders voice-assistant UX.
2) **Python LiveKit Agent**: a separate process that connects to the same LiveKit project and runs the assistant (STT/LLM/TTS).

### Key request / connection flow

- `app/page.tsx` (client component) drives the connection lifecycle:
  - Calls `GET /api/token` to fetch a LiveKit access token + `LIVEKIT_URL`.
  - Creates a `LiveKitRoom` using `@livekit/components-react`.
  - Renders `components/AssistantInterface.tsx`, which uses `useVoiceAssistant()` for status/visualization/mic toggle.

- `app/api/token/route.ts` is the only backend in this repo:
  - Uses `livekit-server-sdk` to mint a JWT for a hard-coded room name (`volini-room`).
  - Reads LiveKit credentials from environment variables.

- `agent/agent.py` provides the voice assistant logic:
  - Defines an `AgentServer` with an `@server.rtc_session()` handler.
  - Creates an `AgentSession` wired to:
    - `openai.STT()` for speech-to-text
    - `openai.LLM(...)` for the model
    - `openai.TTS()` for text-to-speech
    - `silero.VAD` for voice activity detection
  - On session start, it generates an initial greeting.

### Where to look when changing behavior

- UI / connection and room lifecycle: `app/page.tsx`
- Token issuance / room name / permissions: `app/api/token/route.ts`
- Voice assistant UX (mic toggle, visualizer, status text): `components/AssistantInterface.tsx`
- Assistant personality + STT/LLM/TTS wiring: `agent/agent.py`

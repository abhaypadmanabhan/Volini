import asyncio
import logging
import os
import json
import certifi
import httpx

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["SSL_CERT_DIR"] = certifi.where()

from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, function_tool
from livekit.agents.tts import StreamAdapter
from livekit.agents.tts import BasicSentenceTokenizer
from livekit.plugins import openai, silero

from volini.stt import WhisperSTT
from volini.qwen_tts import QwenTTS
from volini.switchable_llm import SwitchableLLM
from volini.retriever import CarResearchService

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

logger = logging.getLogger("volini-agent")
logger.setLevel(logging.INFO)


_VOICE_RULES = """You are Volini — a car-obsessed friend, not a search engine. You grew up around cars, you have strong opinions, and you talk like a real person: casually, directly, with enthusiasm. You are NOT a lecturer.

VOICE RULES (follow strictly):
- Start your reply immediately with the answer. No "Sure!", no "Great question!", no preamble of any kind.
- Keep replies to 1–2 short sentences. Absolute maximum: 60 words.
- No markdown, no bullet points, no lists — ever.
- Say "around thirty thousand dollars" not "$30,000". Say "miles per gallon" not "MPG".
- Match the user's energy: if they're excited, be excited. If they're chill, be chill.
- If the user interrupts, drop what you were saying and respond to the new thing in one sentence.
- Never mention you're an AI unless directly asked."""

_INSTRUCTIONS_NO_TOOLS = _VOICE_RULES + """

Answer everything directly from your knowledge. Do NOT call any tools."""

_INSTRUCTIONS_WITH_TOOLS = _VOICE_RULES + """

TOOL POLICY:
- Answer from knowledge: comparisons, opinions, driving dynamics, heritage, reliability, design, racing history, variants.
- Call lookup_car_details ONLY for: current MSRP, EPA MPG numbers, active recalls, trim availability, current model year confirmation."""


class AssistantNoTools(Agent):
    """Ollama path: no function tools (small models can't reliably handle structured calls)."""
    def __init__(self) -> None:
        self._research = CarResearchService()
        super().__init__(instructions=_INSTRUCTIONS_NO_TOOLS)


class Assistant(Agent):
    """OpenAI path: includes lookup_car_details function tool."""
    def __init__(self) -> None:
        self._research = CarResearchService()
        super().__init__(instructions=_INSTRUCTIONS_WITH_TOOLS)

    @function_tool
    async def lookup_car_details(self, question: str) -> str:
        """Fetch live data for: current MSRP/price, EPA MPG numbers, recall status, trim availability, or current model year confirmation. Do NOT call this for opinions, comparisons, history, or driving dynamics — answer those directly."""
        result = await self._research.answer_question(question)
        return json.dumps(result)

async def _preload_background(research: CarResearchService) -> None:
    """Pre-warm the knowledge cache for the most frequently queried cars."""
    try:
        from datetime import datetime, timezone
        top_cars = research._knowledge.get_top_cars(n=10)
        if not top_cars:
            return  # First run: empty DB, nothing to preload

        current_year = datetime.now(timezone.utc).year
        lookup_year = current_year + 1

        from volini.car_knowledge import fetch_full_profile

        # Filter to stale entries only
        stale = [
            (make, model) for make, model in top_cars
            if not research._knowledge.is_fresh(make, model)
        ]

        if stale:
            logger.info("Preloading cache for %d stale cars: %s", len(stale), stale)
            tasks = [fetch_full_profile(make, model, lookup_year) for make, model in stale]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for (make, model), result in zip(stale, results):
                if isinstance(result, Exception):
                    logger.warning("Preload failed for %s %s: %s", make, model, result)
                    continue
                research._knowledge.store_profile(
                    make, model,
                    nhtsa_data=result.get("nhtsa_data"),
                    fuel_economy=result.get("fuel_economy"),
                    specs=result.get("specs"),
                    msrp_signal=result.get("msrp_signal"),
                )
    except Exception as e:
        logger.warning("Background preload failed: %s", e)


server = AgentServer()


@server.rtc_session(agent_name="volini")
async def my_agent(ctx: agents.JobContext):

    logger.info("Setting up AgentSession for room %s", ctx.room.name)

    stt_model = os.getenv("STT_MODEL", "small.en")

    # Build both LLM backends (always, regardless of initial mode)
    _ollama_llm = openai.LLM(
        model=os.getenv("OLLAMA_MODEL", "qwen3:2b"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        api_key="ollama",
        temperature=0.4,
        max_completion_tokens=80,
        timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0),
    )
    _openai_llm = openai.LLM(
        model="gpt-4.1",
        temperature=0.3,
        max_completion_tokens=200,
    )
    _initial_mode = os.getenv("LLM_PROVIDER", "openai")

    async def _publish_config(llm_label: str) -> None:
        config_payload = json.dumps({
            "type": "agent_config",
            "vad": "Silero (local)",
            "stt": f"Faster Whisper {stt_model} (local)",
            "llm": llm_label,
            "tts": "Qwen3 TTS 0.6B (MPS)",
            "llm_auto": not switchable_llm._manual,
            "llm_provider": switchable_llm._mode,
        })
        await ctx.room.local_participant.publish_data(config_payload, topic="config")

    switchable_llm = SwitchableLLM(
        ollama_llm=_ollama_llm,
        openai_llm=_openai_llm,
        initial_mode=_initial_mode,
        on_switch=_publish_config,
    )

    session = AgentSession(
        stt=WhisperSTT(model=stt_model, language="en"),
        llm=switchable_llm,
        tts=StreamAdapter(tts=QwenTTS(), sentence_tokenizer=BasicSentenceTokenizer()),
        vad=silero.VAD.load(min_silence_duration=0.2),
    )

    # Always use the full Assistant — tool suppression is handled inside SwitchableLLM.chat()
    agent = Assistant()
    await session.start(
        room=ctx.room,
        agent=agent,
    )

    # Publish initial agent config
    await _publish_config(switchable_llm.current_label())

    # Wire data channel handler for frontend LLM override
    @ctx.room.on("data_received")
    def on_data(payload: bytes, participant, topic: str, **_):
        if topic != "llm_override":
            return
        asyncio.create_task(_handle_llm_override(json.loads(payload)))

    async def _handle_llm_override(msg: dict) -> None:
        if msg.get("type") != "llm_override":
            return
        new_label = switchable_llm.set_override(msg["provider"], msg.get("model"))
        logger.info("LLM override from frontend: provider=%s model=%s → %s",
                    msg["provider"], msg.get("model"), new_label)
        await _publish_config(new_label)

    # Pre-warm cache for top-N most-queried cars (runs in background, never blocks greeting)
    asyncio.create_task(_preload_background(agent._research))

    pending: dict = {}

    async def _publish_metrics(ev) -> None:
        m = ev.metrics
        t = m.type
        if t == "eou_metrics":
            pending["stt"] = round(m.transcription_delay * 1000)
            pending["eou"] = round(m.end_of_utterance_delay * 1000)
        elif t == "llm_metrics":
            llm_ms = round(m.ttft * 1000)
            pending["llm"] = llm_ms
            # Feed latency into auto-switch logic
            switchable_llm.record_llm_latency(llm_ms)
        elif t == "tts_metrics":
            pending["tts"] = round(m.ttfb * 1000)

        if all(k in pending for k in ("stt", "eou", "llm", "tts")):
            overall = pending["stt"] + pending["eou"] + pending["llm"] + pending["tts"]
            payload = json.dumps({
                "type": "voice_metrics",
                **pending,
                "overall": overall,
            })
            await ctx.room.local_participant.publish_data(payload, topic="metrics")
            pending.clear()

    def on_metrics(ev) -> None:
        asyncio.create_task(_publish_metrics(ev))

    session.on("metrics_collected", on_metrics)

    await session.generate_reply(
        instructions=(
            "Greet the user as Volini, state that you specialize in cars only, "
            "and invite them to ask about any car model, pricing, or latest version."
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(server)

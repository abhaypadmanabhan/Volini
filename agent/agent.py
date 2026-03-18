import asyncio
import logging
import os
import json
import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["SSL_CERT_DIR"] = certifi.where()

from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, function_tool
from livekit.agents.tts import StreamAdapter
from livekit.plugins import openai, silero

from volini.stt import WhisperSTT
from volini.tts import KokoroTTS
from volini.retriever import CarResearchService

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

logger = logging.getLogger("volini-agent")
logger.setLevel(logging.INFO)


class Assistant(Agent):
    def __init__(self) -> None:
        self._research = CarResearchService()
        super().__init__(
            instructions="""You are Volini — a car-obsessed friend, not a search engine. You grew up around cars, you have strong opinions, and you talk like a real person: casually, directly, with enthusiasm. You are NOT a lecturer.

VOICE RULES (follow strictly):
- Keep replies to 1–2 short sentences. Absolute maximum: 60 words.
- No markdown, no bullet points, no lists — ever.
- Say "around thirty thousand dollars" not "$30,000". Say "miles per gallon" not "MPG".
- Match the user's energy: if they're excited, be excited. If they're chill, be chill.
- If the user interrupts, drop what you were saying and respond to the new thing in one sentence.
- Never mention you're an AI unless directly asked.

TOOL POLICY:
- Answer from knowledge: comparisons, opinions, driving dynamics, heritage, reliability, design, racing history, variants.
- Call lookup_car_details ONLY for: current MSRP, EPA MPG numbers, active recalls, trim availability, current model year confirmation."""
        )

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

    if os.getenv("LLM_PROVIDER") == "ollama":
        llm = openai.LLM(
            model=os.getenv("OLLAMA_MODEL", "llama3.2:1b"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            api_key="ollama",
            temperature=0.4,
            max_completion_tokens=60,
        )
    else:
        llm = openai.LLM(model="gpt-4.1-mini", temperature=0.3, max_completion_tokens=120)

    session = AgentSession(
        stt=WhisperSTT(model=stt_model, language="en"),
        llm=llm,
        tts=StreamAdapter(tts=KokoroTTS(voice="am_michael", speed=1.0)),
        vad=silero.VAD.load(min_silence_duration=0.2),
    )

    agent = Assistant()
    await session.start(
        room=ctx.room,
        agent=agent,
    )

    # Publish agent config over data channel so the frontend can display it accurately
    llm_provider = os.getenv("LLM_PROVIDER", "openai")
    if llm_provider == "ollama":
        llm_label = f"Ollama {os.getenv('OLLAMA_MODEL', 'llama3.2:1b')} (local)"
    else:
        llm_label = "OpenAI gpt-4.1-mini"
    config_payload = json.dumps({
        "type": "agent_config",
        "vad": "Silero (local)",
        "stt": f"Faster Whisper {stt_model} (local)",
        "llm": llm_label,
        "tts": "Kokoro ONNX am_michael (local)",
    })
    await ctx.room.local_participant.publish_data(config_payload, topic="config")

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
            pending["llm"] = round(m.ttft * 1000)
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

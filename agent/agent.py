import asyncio
import faulthandler
import logging
import os
import json
import time
import certifi

faulthandler.enable()  # dumps C-level stack trace to stderr on SIGSEGV

# Keep SSL env vars — retriever.py and entity_resolver.py use urllib.request.urlopen
# for NHTSA and DuckDuckGo HTTPS calls; these must be set before any network call.
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["SSL_CERT_DIR"] = certifi.where()

from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, function_tool
from livekit.plugins import openai as openai_plugin, silero, deepgram
from livekit.agents.tts import StreamAdapter
from livekit.agents import tokenize
from volini.smallest_tts import SmallestTTS

from volini.retriever import CarResearchService
from prompts import build_system_prompt

load_dotenv(
    dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
)

logger = logging.getLogger("volini-agent")
logger.setLevel(logging.INFO)

_INSTRUCTIONS = build_system_prompt(
    demo=os.getenv("DEMO_MODE", "").lower() == "true"
)


class Assistant(Agent):
    def __init__(self) -> None:
        self._research = CarResearchService()
        super().__init__(instructions=_INSTRUCTIONS)

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
            (make, model)
            for make, model in top_cars
            if not research._knowledge.is_fresh(make, model)
        ]

        if stale:
            logger.info("Preloading cache for %d stale cars: %s", len(stale), stale)
            tasks = [
                fetch_full_profile(make, model, lookup_year) for make, model in stale
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for (make, model), result in zip(stale, results):
                if isinstance(result, Exception):
                    logger.warning("Preload failed for %s %s: %s", make, model, result)
                    continue
                research._knowledge.store_profile(
                    make,
                    model,
                    nhtsa_data=result.get("nhtsa_data"),
                    fuel_economy=result.get("fuel_economy"),
                    specs=result.get("specs"),
                    msrp_signal=result.get("msrp_signal"),
                )
    except Exception as e:
        logger.warning("Background preload failed: %s", e)


server = AgentServer(num_idle_processes=1, job_memory_warn_mb=2000)


@server.rtc_session(agent_name="volini")
async def my_agent(ctx: agents.JobContext):

    logger.info("Setting up AgentSession for room %s", ctx.room.name)

    stt = deepgram.STT(
        model="nova-3",
        language="en",
        smart_format=True,
        no_delay=True,
        interim_results=True,
        endpointing_ms=25,
        api_key=os.getenv("DEEPGRAM_API"),
    )

    llm = openai_plugin.LLM(
        model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1",
        api_key=os.getenv("GROQ_API"),
        temperature=0.7,
        max_completion_tokens=120,
    )

    tts = StreamAdapter(
        tts=SmallestTTS(),
        sentence_tokenizer=tokenize.basic.SentenceTokenizer(),
    )

    vad = silero.VAD.load(
        min_speech_duration=0.05,
        min_silence_duration=0.3,
        prefix_padding_duration=0.1,
        activation_threshold=0.5,
    )

    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=vad,
    )

    agent = Assistant()
    await session.start(
        room=ctx.room,
        agent=agent,
    )

    # Publish static agent config for the frontend metrics panel
    config_payload = json.dumps({
        "type": "agent_config",
        "vad": "Silero (local)",
        "stt": "Deepgram Nova-3",
        "llm": "Groq Llama 3.3 70B",
        "tts": "Smallest.ai Lightning",
    })
    await ctx.room.local_participant.publish_data(config_payload, topic="config")

    # Pre-warm cache for top-N most-queried cars (runs in background, never blocks greeting)
    asyncio.create_task(_preload_background(agent._research))

    pending: dict = {}
    _fallback_tasks: list[asyncio.Task] = []

    async def _do_publish() -> None:
        """Publish pending metrics and clear. Caller must verify pending is complete."""
        tts_ms = pending.get("tts", 0)
        # Wall-clock overall: from end-of-utterance to when TTS finishes
        turn_start = pending.get("turn_start", 0)
        overall = (
            round((time.time() - turn_start) * 1000)
            if turn_start
            else (pending["stt"] + pending["eou"] + pending["llm"] + tts_ms)
        )
        payload = json.dumps(
            {
                "type": "voice_metrics",
                "stt": pending["stt"],
                "eou": pending["eou"],
                "llm": pending["llm"],
                "tts": tts_ms,
                "overall": overall,
            }
        )
        await ctx.room.local_participant.publish_data(payload, topic="metrics")
        logger.debug(
            "Published voice_metrics: stt=%dms eou=%dms llm=%dms tts=%dms overall=%dms",
            pending["stt"],
            pending["eou"],
            pending["llm"],
            tts_ms,
            overall,
        )
        pending.clear()

    async def _flush_fallback() -> None:
        """Fallback: publish after 15 s if tts_metrics never arrived (e.g. interrupted turn)."""
        await asyncio.sleep(15)
        if all(k in pending for k in ("stt", "eou", "llm")):
            await _do_publish()

    async def _publish_metrics(ev) -> None:
        m = ev.metrics
        t = m.type
        if t == "eou_metrics":
            pending["stt"] = round(m.transcription_delay * 1000)
            pending["eou"] = round(m.end_of_utterance_delay * 1000)
            pending["turn_start"] = time.time()
        elif t == "llm_metrics":
            llm_ms = round(m.ttft * 1000)
            pending["llm"] = llm_ms
            t = asyncio.create_task(_flush_fallback())
            _fallback_tasks.append(t)
        elif t == "tts_metrics":
            # Accumulate TTS time from first sentence to last — cumulative wall-clock
            if "tts_start" not in pending:
                pending["tts_start"] = time.time()
            pending["tts"] = round((time.time() - pending["tts_start"]) * 1000)
            # tts_metrics is the last event in the pipeline — publish now if we have everything
            if all(k in pending for k in ("stt", "eou", "llm")):
                await _do_publish()

    def on_metrics(ev) -> None:
        asyncio.create_task(_publish_metrics(ev))

    session.on("metrics_collected", on_metrics)

    await session.generate_reply(
        instructions=(
            "Introduce yourself as Volini, a car expert. One short sentence only. "
            "Do not mention specific car models, previous conversations, or cached data."
        )
    )

    shutdown_event = asyncio.Event()

    async def on_shutdown(reason: str) -> None:
        shutdown_event.set()

    ctx.add_shutdown_callback(on_shutdown)

    try:
        await shutdown_event.wait()
    finally:
        for t in _fallback_tasks:
            t.cancel()


if __name__ == "__main__":
    agents.cli.run_app(server)

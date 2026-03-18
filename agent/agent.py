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
            instructions="""You are Volini — a passionate car enthusiast voice assistant. You know everything about cars: history, heritage, driving dynamics, brand culture, comparisons, and opinions. You are opinionated, concise, and speak naturally (no markdown, no bullet points).

TOOL USAGE POLICY — follow this strictly:
- Answer WITHOUT calling any tool: comparisons between cars, opinions on which car is better, driving character/dynamics, brand heritage and history, general reliability reputation, design philosophy, racing heritage, famous variants or special editions.
- ONLY call lookup_car_details for: specific current MSRP or price ranges, official EPA fuel economy numbers (MPG), active recall status, trim level availability for a specific model year, confirmation of current model year availability.

If the question can be answered from your training knowledge, answer it directly. Only use the tool when you genuinely need live data.

Keep responses 2-4 sentences. No markdown. No bullet points. Expand abbreviations naturally for speech (say "miles per gallon" not "MPG", say "starting price" not "MSRP")."""
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

    session = AgentSession(
        stt=WhisperSTT(model="small.en", language="en"),
        llm=openai.LLM(model="gpt-4.1-mini", temperature=0.3),
        tts=KokoroTTS(voice="am_michael", speed=1.0),
        vad=silero.VAD.load(min_silence_duration=0.2),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
    )

    # Pre-warm cache for top-N most-queried cars (runs in background, never blocks greeting)
    asyncio.create_task(_preload_background(Assistant()._research))

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

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

from volini.domain_guard import classify_domain
from volini.retriever import CarResearchService

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

logger = logging.getLogger("volini-agent")
logger.setLevel(logging.INFO)


class Assistant(Agent):
    def __init__(self) -> None:
        self._research = CarResearchService()
        super().__init__(
            instructions="""You are a voice assistant named Volini.
            You only discuss cars.
            Refuse non-car topics with one short sentence.
            For latest model year, pricing, trims, and detailed specs, always call lookup_car_details first.
            Keep replies natural and conversational for speech output.
            Keep responses concise, calm, and confident."""
        )

    @function_tool
    async def lookup_car_details(self, question: str) -> str:
        """Fetch latest car details, pricing signals, and model information."""
        result = self._research.answer_question(question)
        return json.dumps(result)

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


server = AgentServer()


@server.rtc_session(agent_name="volini")
async def my_agent(ctx: agents.JobContext):

    logger.info("Setting up AgentSession for room %s", ctx.room.name)

    session = AgentSession(
        stt=openai.STT(model="gpt-4o-mini-transcribe", language="en"),
        llm=openai.LLM(model="gpt-4.1-mini", temperature=0.3),
        tts=openai.TTS(
            model="gpt-4o-mini-tts",
            voice="ash",
            speed=0.97,
            instructions=(
                "Speak naturally like a human automotive specialist. "
                "Use smooth pacing, short clauses, and warm confidence."
            ),
        ),
        vad=silero.VAD.load(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
    )

    await session.generate_reply(
        instructions=(
            "Greet the user as Volini, state that you specialize in cars only, "
            "and invite them to ask about any car model, pricing, or latest version."
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(server)

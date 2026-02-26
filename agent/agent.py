import logging
import os
import certifi
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['SSL_CERT_DIR'] = certifi.where()

from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import openai, silero

load_dotenv()

logger = logging.getLogger("volini-agent")
logger.setLevel(logging.INFO)

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a voice assistant named Volini.
            Your interface with users will be voice.
            You should use short and concise responses, and avoid usage of unpronounceable punctuation.
            You must hold a high UX standard and be helpful, calm, and confident."""
        )

server = AgentServer()

@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    
    logger.info("Setting up AgentSession for room %s", ctx.room.name)
    
    session = AgentSession(
        stt=openai.STT(),
        llm=openai.LLM(model="gpt-4o"),
        tts=openai.TTS(),
        vad=silero.VAD.load(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
    )

    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )

if __name__ == "__main__":
    agents.cli.run_app(server)

import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const roomName = "volini-room";
    const participantName = `user-${Math.floor(Math.random() * 10000)}`;

    if (
        !process.env.LIVEKIT_API_KEY ||
        !process.env.LIVEKIT_API_SECRET
    ) {
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 }
        );
    }

    const at = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        {
            identity: participantName,
            name: participantName,
        }
    );

    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    const token = await at.toJwt();

    const agentClient = new AgentDispatchClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!
    );
    await agentClient.createDispatch(roomName, "volini");

    return NextResponse.json({ token, url: process.env.LIVEKIT_URL });
}

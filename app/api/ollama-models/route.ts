import { NextResponse } from "next/server";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export async function GET() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
            signal: AbortSignal.timeout(2000),
        });
        const data = await res.json();
        const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
        return NextResponse.json({ models, error: null });
    } catch {
        return NextResponse.json({ models: [], error: "Ollama offline" });
    }
}

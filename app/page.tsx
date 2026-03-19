"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useState } from "react";
import { ArrowRight, Mic, Zap, BarChart2 } from "lucide-react";
import AssistantInterface from "../components/AssistantInterface";

/* ── Landing page ──────────────────────────────────────────────── */

function LandingPage({
    onConnect,
    connecting,
    error,
}: {
    onConnect: () => void;
    connecting: boolean;
    error: string | null;
}) {
    return (
        <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
            {/* Hero ─────────────────────────────────────────────── */}
            <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
                {/* Radial glow at bottom-center */}
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[320px] pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse at 50% 100%, rgba(31,213,249,0.12) 0%, transparent 70%)",
                    }}
                />

                {/* Speed lines */}
                <SpeedLines />

                {/* Eyebrow badge */}
                <div
                    className="animate-fade-up mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03]"
                    style={{ animationDelay: "0ms" }}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full animate-accent-pulse"
                        style={{ backgroundColor: "var(--accent)" }}
                    />
                    <span
                        className="text-[11px] font-mono uppercase tracking-[0.18em]"
                        style={{ color: "var(--accent)" }}
                    >
                        AI Voice Assistant
                    </span>
                </div>

                {/* Hero wordmark */}
                <h1
                    className="animate-fade-up font-black tracking-[-0.04em] leading-none text-white"
                    style={{
                        fontSize: "clamp(5rem, 14vw, 12rem)",
                        animationDelay: "60ms",
                    }}
                >
                    VOLINI
                </h1>

                {/* Subtext */}
                <p
                    className="animate-fade-up mt-5 text-[1.1rem] font-light tracking-wide"
                    style={{ color: "#71717a", animationDelay: "160ms" }}
                >
                    Your AI co-pilot. Every drive.
                </p>

                {/* CTA */}
                <div
                    className="animate-fade-up mt-10 flex flex-col items-center gap-4"
                    style={{ animationDelay: "280ms" }}
                >
                    {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                            {error}
                        </p>
                    )}

                    <button
                        onClick={onConnect}
                        disabled={connecting}
                        className="group relative flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-[#09090b] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.98]"
                        style={{
                            backgroundColor: "var(--accent)",
                            boxShadow: "0 0 32px rgba(31,213,249,0.3), 0 0 64px rgba(31,213,249,0.1)",
                        }}
                    >
                        {connecting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-[#09090b]/30 border-t-[#09090b] rounded-full animate-spin" />
                                Connecting…
                            </>
                        ) : (
                            <>
                                Wake up Volini
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </>
                        )}
                    </button>

                    {/* Tech stack hint */}
                    <p
                        className="text-[11px] font-mono tracking-wider"
                        style={{ color: "#3f3f46" }}
                    >
                        Faster Whisper · GPT-4.1-mini · Kokoro TTS
                    </p>
                </div>

                {/* Scroll indicator */}
                <div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in"
                    style={{ animationDelay: "600ms", color: "#27272a" }}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4v12M4 10l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </section>

            {/* Features ─────────────────────────────────────────── */}
            <section className="px-6 py-24 max-w-5xl mx-auto">
                <p
                    className="text-[11px] font-mono uppercase tracking-[0.2em] mb-12 text-center"
                    style={{ color: "var(--accent)" }}
                >
                    Capabilities
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FeatureCard
                        icon={<Mic className="w-5 h-5" />}
                        title="Ask Anything"
                        body="Real-time answers about any car, model, trim, or spec — just speak."
                    />
                    <FeatureCard
                        icon={<Zap className="w-5 h-5" />}
                        title="Real-Time Intelligence"
                        body="Instant NHTSA safety data and market price signals on demand."
                    />
                    <FeatureCard
                        icon={<BarChart2 className="w-5 h-5" />}
                        title="Performance Metrics"
                        body="Per-turn STT · LLM · TTS latency, always visible."
                    />
                </div>
            </section>

            {/* Tech strip ───────────────────────────────────────── */}
            <div
                className="border-y px-6 py-4 text-center font-mono text-[11px] tracking-wider"
                style={{
                    borderColor: "var(--hud-border)",
                    color: "#3f3f46",
                }}
            >
                VAD: Silero&nbsp;&nbsp;·&nbsp;&nbsp;STT: Faster Whisper&nbsp;&nbsp;·&nbsp;&nbsp;LLM: GPT-4.1 mini&nbsp;&nbsp;·&nbsp;&nbsp;TTS: Kokoro ONNX
            </div>

            {/* Footer gap */}
            <div className="h-16" />
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div
            className="hud-corner group relative p-6 rounded-2xl border transition-all duration-300 hover:bg-white/[0.03]"
            style={{
                borderColor: "var(--hud-border)",
                background: "var(--surface)",
            }}
        >
            <div
                className="mb-4 w-9 h-9 flex items-center justify-center rounded-xl"
                style={{
                    backgroundColor: "var(--accent-dim)",
                    color: "var(--accent)",
                }}
            >
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#71717a" }}>
                {body}
            </p>
        </div>
    );
}

function SpeedLines() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            {[
                { top: "32%", left: "8%",  width: 180, rotate: -8,  delay: "0s",    duration: "4s" },
                { top: "58%", right: "6%", width: 120, rotate: 6,   delay: "1.4s",  duration: "5s" },
                { top: "22%", right: "18%",width: 80,  rotate: -12, delay: "2.8s",  duration: "4.5s" },
            ].map((line, i) => (
                <div
                    key={i}
                    className="absolute h-px"
                    style={{
                        top: line.top,
                        left: "left" in line ? line.left : undefined,
                        right: "right" in line ? line.right : undefined,
                        width: line.width,
                        background: `linear-gradient(90deg, transparent, rgba(31,213,249,0.3), transparent)`,
                        transform: `rotate(${line.rotate}deg)`,
                        animation: `speed-line ${line.duration} ease-in-out ${line.delay} infinite`,
                    }}
                />
            ))}
        </div>
    );
}

/* ── Page root ─────────────────────────────────────────────────── */

export default function Home() {
    const [token, setToken] = useState("");
    const [serverUrl, setServerUrl] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connect = async () => {
        try {
            setConnecting(true);
            setError(null);
            const res = await fetch("/api/token");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch token");
            setToken(data.token);
            setServerUrl(data.url);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Connection failed");
        } finally {
            setConnecting(false);
        }
    };

    const disconnect = () => {
        setToken("");
        setServerUrl("");
    };

    if (token && serverUrl) {
        return (
            <div className="fixed inset-0 bg-[#09090b] z-50">
                <LiveKitRoom
                    token={token}
                    serverUrl={serverUrl}
                    connect={true}
                    audio={true}
                    video={false}
                    onDisconnected={disconnect}
                >
                    <AssistantInterface onDisconnect={disconnect} />
                    <RoomAudioRenderer />
                </LiveKitRoom>
            </div>
        );
    }

    return (
        <LandingPage onConnect={connect} connecting={connecting} error={error} />
    );
}

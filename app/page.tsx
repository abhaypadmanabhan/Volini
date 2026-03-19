"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mic, Zap, BarChart2, Database, Cpu, Sliders, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
            {/* Nav ──────────────────────────────────────────────── */}
            <nav
                className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
                style={{
                    background: "rgba(9,9,11,0.8)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderColor: "var(--hud-border)",
                }}
            >
                <span
                    className="gradient-text font-black tracking-[-0.04em] text-xl"
                >
                    VOLINI
                </span>
                <Button
                    variant="default"
                    size="sm"
                    onClick={onConnect}
                    disabled={connecting}
                    className="flex items-center gap-2"
                >
                    {connecting ? (
                        <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Connecting…
                        </>
                    ) : (
                        <>
                            Wake up Volini
                            <ArrowRight className="w-3.5 h-3.5" />
                        </>
                    )}
                </Button>
            </nav>

            {/* Hero ─────────────────────────────────────────────── */}
            <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
                {/* Dot-grid background */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                    }}
                />
                {/* Radial violet glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(139,92,246,0.15) 0%, transparent 70%)",
                    }}
                />

                {/* Decorative orb */}
                <motion.div
                    className="animate-float mb-8 relative flex items-center justify-center"
                    style={{ width: 200, height: 200 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0, duration: 0.6 }}
                >
                    {/* Pulsing ring */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: 200,
                            height: 200,
                            border: "1px solid rgba(139,92,246,0.3)",
                            animation: "ring-pulse 3s ease-out infinite",
                        }}
                    />
                    {/* Orb */}
                    <div
                        className="rounded-full"
                        style={{
                            width: 140,
                            height: 140,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0.05) 60%, transparent 100%)",
                        }}
                    />
                </motion.div>

                {/* Eyebrow badge */}
                <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                >
                    <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: "var(--accent)" }}
                        />
                        AI Voice Assistant for Cars
                    </Badge>
                </motion.div>

                {/* H1 */}
                <motion.h1
                    className="gradient-text font-black tracking-[-0.04em]"
                    style={{
                        fontSize: "clamp(5rem, 14vw, 12rem)",
                        lineHeight: 1,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16, duration: 0.6 }}
                >
                    VOLINI
                </motion.h1>

                {/* Tagline */}
                <motion.p
                    className="mt-5 text-[1.1rem] font-light tracking-wide text-zinc-400"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24, duration: 0.6 }}
                >
                    Your AI co-pilot for every drive.
                </motion.p>

                {/* Sub-tagline */}
                <motion.p
                    className="mt-3 text-[0.75rem] font-mono text-zinc-600"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    Sub-second latency · Local STT · Live recall data
                </motion.p>

                {/* CTA */}
                <motion.div
                    className="mt-10 flex flex-col items-center gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38, duration: 0.6 }}
                >
                    <Button
                        variant="default"
                        size="lg"
                        onClick={onConnect}
                        disabled={connecting}
                        className="flex items-center gap-3"
                    >
                        {connecting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Connecting…
                            </>
                        ) : (
                            <>
                                Wake up Volini
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.p
                            className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Scroll indicator */}
                <div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-800"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4v12M4 10l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </section>

            {/* How It Works ─────────────────────────────────────── */}
            <section className="px-6 py-24 max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <div
                        className="inline-block w-8 h-0.5 mb-4"
                        style={{ backgroundColor: "var(--accent)" }}
                    />
                    <h2 className="text-2xl font-bold text-white">How it works</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connector line on desktop */}
                    <div
                        className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px pointer-events-none"
                        style={{
                            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
                            opacity: 0.3,
                        }}
                    />

                    {[
                        {
                            num: "01",
                            title: "Speak",
                            body: "Ask anything about any car — models, pricing, specs, recalls",
                        },
                        {
                            num: "02",
                            title: "Volini listens",
                            body: "Faster Whisper STT + Silero VAD process your voice locally in real time",
                        },
                        {
                            num: "03",
                            title: "You hear the answer",
                            body: "GPT-4.1-mini + Kokoro TTS deliver a voiced answer in under a second",
                        },
                    ].map((step, i) => (
                        <motion.div
                            key={step.num}
                            className="text-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15, duration: 0.6 }}
                        >
                            <div className="text-5xl font-black gradient-text opacity-40 mb-4">
                                {step.num}
                            </div>
                            <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                            <p className="text-xs text-zinc-500 leading-relaxed">{step.body}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Features Grid ────────────────────────────────────── */}
            <section className="px-6 py-24 max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <div
                        className="inline-block w-8 h-0.5 mb-4"
                        style={{ backgroundColor: "var(--accent)" }}
                    />
                    <h2 className="text-2xl font-bold text-white">Everything you need</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { icon: <Mic className="w-5 h-5" />, title: "Ask Anything", body: "Any car, model, trim, spec — just speak" },
                        { icon: <Zap className="w-5 h-5" />, title: "Sub-second", body: "STT + LLM + TTS pipeline optimized for latency" },
                        { icon: <Database className="w-5 h-5" />, title: "Live data", body: "NHTSA safety recalls and MSRP signals via DuckDuckGo" },
                        { icon: <BarChart2 className="w-5 h-5" />, title: "Latency HUD", body: "Per-turn STT/LLM/TTS breakdown always visible" },
                        { icon: <Cpu className="w-5 h-5" />, title: "Runs locally", body: "Faster Whisper and Silero VAD run on-device" },
                        { icon: <Sliders className="w-5 h-5" />, title: "Switch models", body: "Toggle between GPT-4.1 and local Ollama in real time" },
                    ].map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <Card
                                className="h-full border transition-colors duration-300 hover:bg-white/[0.03]"
                                style={{
                                    borderColor: "var(--hud-border)",
                                    background: "var(--surface)",
                                }}
                            >
                                <CardHeader>
                                    <div
                                        className="mb-3 w-9 h-9 flex items-center justify-center rounded-xl"
                                        style={{
                                            backgroundColor: "var(--accent-dim)",
                                            color: "var(--accent)",
                                        }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-sm font-semibold text-white">{feature.title}</CardTitle>
                                    <CardDescription className="text-xs text-zinc-500">{feature.body}</CardDescription>
                                </CardHeader>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Tech Pipeline ────────────────────────────────────── */}
            <section className="px-6 py-24 max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <div
                        className="inline-block w-8 h-0.5 mb-4"
                        style={{ backgroundColor: "var(--accent)" }}
                    />
                    <h2 className="text-2xl font-bold text-white">The pipeline</h2>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                    {[
                        { name: "VAD", subtitle: "Silero" },
                        { name: "STT", subtitle: "Faster Whisper" },
                        { name: "LLM", subtitle: "GPT-4.1" },
                        { name: "TTS", subtitle: "Kokoro" },
                    ].map((node, i) => (
                        <div key={node.name} className="flex items-center gap-2">
                            <div
                                className="px-4 py-3 rounded-xl border text-center min-w-[80px]"
                                style={{
                                    borderColor: "var(--hud-border)",
                                    background: "var(--surface)",
                                }}
                            >
                                <div className="text-xs font-semibold text-white">{node.name}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">{node.subtitle}</div>
                            </div>
                            {i < 3 && (
                                <ChevronRight
                                    className="w-4 h-4 flex-shrink-0"
                                    style={{ color: "var(--accent)" }}
                                />
                            )}
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <ChevronRight
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: "var(--accent)" }}
                        />
                        <div
                            className="px-4 py-3 rounded-xl border text-center"
                            style={{
                                borderColor: "var(--hud-border)",
                                background: "var(--surface)",
                            }}
                        >
                            <div className="text-lg">🔊</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA ───────────────────────────────────────── */}
            <section
                className="relative px-6 py-32 text-center overflow-hidden"
            >
                {/* Violet radial glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)",
                    }}
                />
                <div className="relative z-10 max-w-5xl mx-auto">
                    <motion.h2
                        className="gradient-text text-4xl font-black tracking-[-0.03em] mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        Ready to drive smarter?
                    </motion.h2>
                    <motion.p
                        className="text-zinc-400 mb-10"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                    >
                        Ask Volini about any car, anytime.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <Button
                            variant="default"
                            size="lg"
                            onClick={onConnect}
                            disabled={connecting}
                            className="flex items-center gap-3 mx-auto"
                        >
                            {connecting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Connecting…
                                </>
                            ) : (
                                <>
                                    Wake up Volini
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* Footer ───────────────────────────────────────────── */}
            <footer className="px-6 py-8 text-center">
                <p className="text-xs font-mono text-zinc-700">
                    © 2026 Volini · Built with LiveKit, OpenAI, Faster Whisper, Kokoro TTS
                </p>
            </footer>
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

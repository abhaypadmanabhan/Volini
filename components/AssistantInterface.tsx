"use client";

import { useVoiceAssistant, TrackToggle, useDataChannel } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Power } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import MetricsPanel, { TurnMetrics } from "./MetricsPanel";
import AgentAudioVisualizerAura from "./agents-ui/agent-audio-visualizer-aura";

interface AssistantInterfaceProps {
    onDisconnect: () => void;
}

type VoiceState = "connecting" | "listening" | "speaking" | "thinking" | "initializing" | string;

const STATE_LABEL: Record<string, string> = {
    connecting:    "Connecting",
    initializing:  "Initializing",
    listening:     "Listening",
    thinking:      "Processing",
    speaking:      "Speaking",
};

const STATE_BADGE_COLOR: Record<string, string> = {
    listening: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    speaking:  "bg-[rgba(139,92,246,0.15)] text-[#8B5CF6] border-[rgba(139,92,246,0.3)]",
    thinking:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

// Color per provider type — shown in header pills
const PROVIDER_PILLS = (config: Record<string, string> | null) => [
    { label: "STT", value: config?.stt ?? "Deepgram Nova-3", color: "#34d399" },
    { label: "LLM", value: config?.llm ?? "Groq 70B",        color: "#8B5CF6" },
    { label: "TTS", value: config?.tts ?? "Deepgram Aura-2", color: "#EC4899" },
];

export default function AssistantInterface({ onDisconnect }: AssistantInterfaceProps) {
    const { state } = useVoiceAssistant();
    const [turns, setTurns] = useState<TurnMetrics[]>([]);
    const [agentConfig, setAgentConfig] = useState<Record<string, string> | null>(null);

    /* ── Data channel listeners ── */
    useDataChannel("metrics", (msg) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(msg.payload));
            if (data.type === "voice_metrics") {
                const { stt, eou, llm, tts, overall } = data;
                setTurns((prev) => [...prev, { stt, eou, llm, tts, overall }]);
            }
        } catch {}
    });

    useDataChannel("config", (msg) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(msg.payload));
            if (data.type === "agent_config") {
                setAgentConfig({
                    vad: data.vad,
                    stt: data.stt,
                    llm: data.llm,
                    tts: data.tts,
                });
            }
        } catch {}
    });

    /* ── Interrupted state detection ── */
    const prevStateRef = useRef<VoiceState>("");
    const prevStateTimeRef = useRef<number>(0);
    const [isInterrupted, setIsInterrupted] = useState(false);

    useEffect(() => {
        const now = Date.now();
        if (prevStateRef.current === "speaking" && state === "listening") {
            const elapsed = now - prevStateTimeRef.current;
            if (elapsed < 1500) {
                // Defer setState to avoid synchronous update-in-effect warning
                const t = setTimeout(() => {
                    setIsInterrupted(true);
                    setTimeout(() => setIsInterrupted(false), 800);
                }, 0);
                return () => clearTimeout(t);
            }
        }
        prevStateRef.current = state;
        prevStateTimeRef.current = now;
    }, [state]);

    const badgeClass = STATE_BADGE_COLOR[state] ?? "bg-zinc-800 text-zinc-500 border-zinc-700";
    const stateLabel = STATE_LABEL[state] ?? state;

    const statusText = isInterrupted
        ? "Interrupted"
        : state === "speaking"    ? "Volini is speaking"
        : state === "listening"   ? "Listening"
        : state === "thinking"    ? "Processing"
        : (state === "connecting" || state === "initializing") ? "Starting up"
        : "—";

    return (
        <div className="h-screen w-full flex flex-col bg-[#09090b] overflow-hidden carbon-bg">

            {/* ── Top bar ── */}
            <header
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: "var(--hud-border)" }}
            >
                {/* Left: wordmark + state badge */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold tracking-[0.12em] text-white">
                        VOLINI
                    </span>
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={state}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className={clsx(
                                "px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full border",
                                badgeClass
                            )}
                        >
                            {stateLabel}
                        </motion.span>
                    </AnimatePresence>
                    <AnimatePresence>
                        {isInterrupted && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full border bg-orange-500/15 text-orange-400 border-orange-500/30"
                            >
                                interrupted
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: provider pills + disconnect */}
                <div className="flex items-center gap-3">
                    {/* Provider pills — fade in once agent sends config */}
                    <AnimatePresence>
                        <motion.div
                            className="hidden sm:flex items-center gap-1.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            {PROVIDER_PILLS(agentConfig).map(({ label, value, color }) => (
                                <span
                                    key={label}
                                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded-full border"
                                    style={{
                                        background: `${color}12`,
                                        color,
                                        borderColor: `${color}30`,
                                    }}
                                >
                                    <span style={{ opacity: 0.6 }}>{label}</span>
                                    <span>{value}</span>
                                </span>
                            ))}
                        </motion.div>
                    </AnimatePresence>

                    <button
                        onClick={onDisconnect}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        title="Disconnect"
                    >
                        <Power className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Center — visualizer */}
                <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <AgentAudioVisualizerAura
                        size="xl"
                        color="#8B5CF6"
                        colorShift={0}
                        state={isInterrupted ? "interrupted" : state}
                    />

                    <motion.p
                        key={statusText}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-mono tracking-wider"
                        style={{ color: "#52525b" }}
                    >
                        {statusText}
                    </motion.p>

                    {/* Mic toggle — contextual glow ring */}
                    <div className="relative group">
                        {state === "speaking" && (
                            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-lg animate-pulse" />
                        )}
                        <div
                            className="relative flex items-center justify-center px-4 py-3 rounded-full transition-all duration-300 group-hover:scale-105"
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid var(--hud-border)",
                                boxShadow: state === "listening"
                                    ? "0 0 20px rgba(52,211,153,0.18)"
                                    : state === "speaking"
                                    ? "0 0 20px rgba(139,92,246,0.18)"
                                    : "none",
                                transition: "box-shadow 0.4s ease",
                            }}
                        >
                            <TrackToggle
                                source={Track.Source.Microphone}
                                showIcon={true}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:text-white transition-all duration-200 active:scale-95"
                            />
                        </div>
                    </div>
                </main>

                {/* Right sidebar — metrics */}
                <aside
                    className="w-80 shrink-0 flex flex-col overflow-y-auto border-l p-4 gap-4"
                    style={{ borderColor: "var(--hud-border)" }}
                >
                    <MetricsPanel turns={turns} agentConfig={agentConfig} />
                </aside>
            </div>
        </div>
    );
}

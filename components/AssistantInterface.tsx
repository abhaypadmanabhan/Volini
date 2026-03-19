"use client";

import { useVoiceAssistant, TrackToggle, useDataChannel } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Power } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import MetricsPanel, { TurnMetrics } from "./MetricsPanel";
import LLMSelector from "./LLMSelector";
import AgentAudioVisualizerAura from "./agents-ui/agent-audio-visualizer-aura";
import { useRoomContext } from "@livekit/components-react";

interface AssistantInterfaceProps {
    onDisconnect: () => void;
}

type VoiceState = "connecting" | "listening" | "speaking" | "thinking" | "initializing" | string;

const STATE_LABEL: Record<string, string> = {
    connecting:    "Connecting…",
    initializing:  "Initializing…",
    listening:     "Listening",
    thinking:      "Thinking",
    speaking:      "Speaking",
};

const STATE_BADGE_COLOR: Record<string, string> = {
    listening: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    speaking:  "bg-[rgba(139,92,246,0.15)] text-[#8B5CF6] border-[rgba(139,92,246,0.3)]",
    thinking:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function AssistantInterface({ onDisconnect }: AssistantInterfaceProps) {
    const { state, audioTrack } = useVoiceAssistant();
    const [turns, setTurns] = useState<TurnMetrics[]>([]);
    const [agentConfig, setAgentConfig] = useState<Record<string, string> | null>(null);

    /* ── Data channel listeners (preserved exactly) ── */
    useDataChannel("metrics", (msg) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(msg.payload));
            console.debug("voice_metrics received:", data);
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
                    llm_auto: String(data.llm_auto ?? true),
                    llm_provider: data.llm_provider ?? "openai",
                });
            }
        } catch {}
    });

    const room = useRoomContext();
    const sendLLMOverride = (payload: Uint8Array) => {
        room.localParticipant.publishData(payload, { topic: "llm_override" });
    };

    /* ── Interrupted state detection (preserved exactly) ── */
    const prevStateRef = useRef<VoiceState>("");
    const prevStateTimeRef = useRef<number>(Date.now());
    const [isInterrupted, setIsInterrupted] = useState(false);
    const isInterruptedRef = useRef<boolean>(false);

    useEffect(() => {
        const now = Date.now();
        if (prevStateRef.current === "speaking" && state === "listening") {
            const elapsed = now - prevStateTimeRef.current;
            if (elapsed < 1500) {
                setIsInterrupted(true);
                isInterruptedRef.current = true;
                setTimeout(() => {
                    setIsInterrupted(false);
                    isInterruptedRef.current = false;
                }, 800);
            }
        }
        prevStateRef.current = state;
        prevStateTimeRef.current = now;
    }, [state]);

    const badgeClass = STATE_BADGE_COLOR[state] ?? "bg-zinc-800 text-zinc-500 border-zinc-700";
    const stateLabel = STATE_LABEL[state] ?? state;

    return (
        <div className="h-screen w-full flex flex-col bg-[#09090b] overflow-hidden carbon-bg">

            {/* ── Top bar ──────────────────────────────────────── */}
            <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--hud-border)" }}>
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

                <button
                    onClick={onDisconnect}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    title="Disconnect"
                >
                    <Power className="w-4 h-4" />
                </button>
            </header>

            {/* ── Body: center aura + right sidebar ─────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Center column — aura */}
                <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <AgentAudioVisualizerAura
                        size="xl"
                        color="#8B5CF6"
                        colorShift={0}
                        state={isInterrupted ? "interrupted" : state}
                    />

                    <p
                        className="text-sm font-mono tracking-wider transition-all duration-500"
                        style={{ color: "#52525b" }}
                    >
                        {isInterrupted
                            ? "Interrupted"
                            : state === "speaking"
                            ? "Volini is speaking…"
                            : state === "listening"
                            ? "Listening…"
                            : state === "thinking"
                            ? "Thinking…"
                            : state === "connecting" || state === "initializing"
                            ? "Starting up…"
                            : "—"}
                    </p>

                    {/* Mic toggle */}
                    <div
                        className="flex items-center justify-center px-3 py-2 rounded-full"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--hud-border)",
                        }}
                    >
                        <TrackToggle
                            source={Track.Source.Microphone}
                            showIcon={true}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
                        />
                    </div>
                </main>

                {/* Right sidebar — always-visible metrics + controls */}
                <aside
                    className="w-80 shrink-0 flex flex-col overflow-y-auto border-l p-4 gap-4"
                    style={{ borderColor: "var(--hud-border)" }}
                >
                    <MetricsPanel
                        turns={turns}
                        agentConfig={agentConfig}
                        llmSelectorSlot={
                            <LLMSelector
                                agentConfig={agentConfig}
                                turns={turns}
                                onOverride={sendLLMOverride}
                                disabled={!agentConfig}
                            />
                        }
                    />
                </aside>
            </div>
        </div>
    );
}

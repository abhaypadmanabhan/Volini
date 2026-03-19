"use client";

import { ReactNode } from "react";

export interface TurnMetrics {
    stt: number;
    eou: number;
    llm: number;
    tts: number;
    overall: number;
}

interface MetricsPanelProps {
    turns: TurnMetrics[];
    agentConfig?: Record<string, string> | null;
    llmSelectorSlot?: ReactNode;
}

const AGENT_CONFIG = [
    { label: "VAD",  value: "Silero (local)" },
    { label: "STT",  value: "Faster Whisper small.en" },
    { label: "LLM",  value: "OpenAI gpt-4.1-mini" },
    { label: "TTS",  value: "Qwen3 TTS 1.7B (MPS)" },
];

const MAX_OVERALL_MS = 1500;

function phaseColor(ms: number): string {
    if (ms < 200) return "text-emerald-400";
    if (ms < 500) return "text-yellow-400";
    return "text-red-400";
}

function overallColor(ms: number): string {
    if (ms < 700)  return "text-emerald-400";
    if (ms < 1200) return "text-yellow-400";
    return "text-red-400";
}

function barColor(ms: number): string {
    if (ms < 700)  return "#34d399";
    if (ms < 1200) return "#facc15";
    return "#f87171";
}

export default function MetricsPanel({ turns, agentConfig, llmSelectorSlot }: MetricsPanelProps) {
    const displayed = [...turns].reverse();
    const avg  = turns.length > 0 ? Math.round(turns.reduce((s, t) => s + t.overall, 0) / turns.length) : null;
    const best = turns.length > 0 ? Math.min(...turns.map((t) => t.overall)) : null;

    const config = agentConfig
        ? [
            { label: "VAD", value: agentConfig.vad },
            { label: "STT", value: agentConfig.stt },
            { label: "LLM", value: agentConfig.llm },
            { label: "TTS", value: agentConfig.tts },
          ]
        : AGENT_CONFIG;

    return (
        <div
            className="w-full flex flex-col gap-3 rounded-2xl p-4"
            style={{
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid var(--hud-border)",
                fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
            }}
        >
            {/* Header strip */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--hud-border)" }}>
                <span className="text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                    Latency HUD
                </span>
                {avg !== null && (
                    <span className="text-[11px] font-mono" style={{ color: "#52525b" }}>
                        avg{" "}
                        <span className={overallColor(avg)}>{avg}ms</span>
                        {best !== null && (
                            <>
                                {" "}· best{" "}
                                <span className={overallColor(best)}>{best}ms</span>
                            </>
                        )}
                    </span>
                )}
            </div>

            {/* Latency table */}
            {turns.length === 0 ? (
                <p className="text-[11px] font-mono italic" style={{ color: "#3f3f46" }}>
                    Waiting for first turn…
                </p>
            ) : (
                <div className="flex flex-col gap-1">
                    {/* Column headers */}
                    <div
                        className="grid gap-x-2 text-[9px] font-mono uppercase tracking-wider px-2 pb-1"
                        style={{ gridTemplateColumns: "1.5rem 1fr 1fr 1fr 1fr 1fr", color: "#3f3f46" }}
                    >
                        <span>#</span>
                        <span>STT</span>
                        <span>EOT</span>
                        <span>LLM</span>
                        <span>TTS</span>
                        <span>Total</span>
                    </div>

                    {displayed.map((turn, i) => {
                        const turnNumber = turns.length - i;
                        const barWidth = Math.min((turn.overall / MAX_OVERALL_MS) * 100, 100);
                        return (
                            <div
                                key={turnNumber}
                                className="relative rounded-lg px-2 py-1.5 overflow-hidden"
                                style={{ background: i === 0 ? "rgba(255,255,255,0.04)" : "transparent" }}
                            >
                                <div
                                    className="absolute inset-y-0 left-0 rounded-lg"
                                    style={{
                                        width: `${barWidth}%`,
                                        backgroundColor: barColor(turn.overall),
                                        opacity: 0.06,
                                    }}
                                />
                                <div
                                    className="relative grid gap-x-2 items-center"
                                    style={{ gridTemplateColumns: "1.5rem 1fr 1fr 1fr 1fr 1fr" }}
                                >
                                    <span className="text-[10px] font-mono" style={{ color: "#3f3f46" }}>
                                        {turnNumber}
                                    </span>
                                    {([turn.stt, turn.eou, turn.llm, turn.tts] as number[]).map((ms, j) => (
                                        <span key={j} className={`text-[10px] font-mono ${phaseColor(ms)}`}>
                                            {ms}ms
                                        </span>
                                    ))}
                                    <span className={`text-[10px] font-mono font-bold ${overallColor(turn.overall)}`}>
                                        {turn.overall}ms
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    <div
                        className="mt-1 pt-2 border-t text-[9px] font-mono"
                        style={{ borderColor: "var(--hud-border)", color: "#52525b" }}
                    >
                        {turns.length} turn{turns.length !== 1 ? "s" : ""}
                    </div>
                </div>
            )}

            {/* Config strip */}
            <div className="pt-2 border-t" style={{ borderColor: "var(--hud-border)" }}>
                <p className="text-[9px] font-mono uppercase tracking-[0.16em] mb-2" style={{ color: "#3f3f46" }}>
                    Stack
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {config.map(({ label, value }) => (
                        <div key={label} className="contents">
                            <span className="text-[10px] font-mono" style={{ color: "#52525b" }}>{label}</span>
                            <span className="text-[10px] font-mono text-zinc-300 truncate">{value}</span>
                        </div>
                    ))}
                </div>
                {llmSelectorSlot}
            </div>
        </div>
    );
}

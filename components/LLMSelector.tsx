"use client";

import { useEffect, useState } from "react";
import { TurnMetrics } from "./MetricsPanel";

interface LLMSelectorProps {
    agentConfig: Record<string, string> | null;
    turns: TurnMetrics[];
    onOverride: (payload: Uint8Array) => void;
    disabled?: boolean;
}

export default function LLMSelector({ agentConfig, turns, onOverride, disabled }: LLMSelectorProps) {
    const [selected, setSelected] = useState<"openai" | "ollama">("openai");

    // Sync selection with agentConfig
    useEffect(() => {
        if (!agentConfig) return;
        setSelected(agentConfig.llm_provider === "ollama" ? "ollama" : "openai");
    }, [agentConfig]);

    // Rolling avg LLM latency (last 5 turns)
    const recent = turns.slice(-5);
    const avgLlm = recent.length > 0
        ? Math.round(recent.reduce((s, t) => s + t.llm, 0) / recent.length)
        : null;

    const isAuto = agentConfig?.llm_auto === "true";

    function handleSelect(value: "openai" | "ollama") {
        setSelected(value);
        const msg = JSON.stringify({
            type: "llm_override",
            provider: value,
            model: null,
        });
        onOverride(new TextEncoder().encode(msg));
    }

    const options: { value: "openai" | "ollama"; label: string }[] = [
        { value: "openai", label: "OpenAI gpt-4.1  ☁" },
        { value: "ollama", label: "Local (Ollama)  ⚡" },
    ];

    return (
        <div
            className="flex flex-col gap-1.5 pt-2 border-t"
            style={{ borderColor: "var(--hud-border)" }}
        >
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-[0.16em]" style={{ color: "#3f3f46" }}>
                    LLM Override
                </span>
                <div className="flex items-center gap-1.5">
                    {avgLlm !== null && (
                        <span className="text-[9px] font-mono" style={{ color: "#52525b" }}>
                            avg{" "}
                            <span style={{ color: avgLlm > 1500 ? "#f87171" : avgLlm > 800 ? "#facc15" : "#34d399" }}>
                                {avgLlm}ms
                            </span>
                        </span>
                    )}
                    <span
                        className="px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded-full border"
                        style={
                            isAuto
                                ? { background: "rgba(52,211,153,0.12)", color: "#34d399", borderColor: "rgba(52,211,153,0.3)" }
                                : { background: "rgba(251,191,36,0.12)", color: "#fbbf24", borderColor: "rgba(251,191,36,0.3)" }
                        }
                    >
                        {isAuto ? "auto" : "manual"}
                    </span>
                </div>
            </div>

            <div className="flex gap-1">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        disabled={disabled}
                        className="flex-1 text-[10px] font-mono px-2 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={
                            selected === opt.value
                                ? {
                                    background: "rgba(139,92,246,0.15)",
                                    color: "#8B5CF6",
                                    border: "1px solid rgba(139,92,246,0.35)",
                                }
                                : {
                                    background: "rgba(255,255,255,0.03)",
                                    color: "#52525b",
                                    border: "1px solid var(--hud-border)",
                                }
                        }
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

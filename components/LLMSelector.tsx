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
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [ollamaError, setOllamaError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string>("");

    // Fetch Ollama models on mount
    useEffect(() => {
        fetch("/api/ollama-models")
            .then((r) => r.json())
            .then((data) => {
                setOllamaModels(data.models ?? []);
                setOllamaError(data.error ?? null);
            })
            .catch(() => setOllamaError("Fetch failed"));
    }, []);

    // Sync selection with agentConfig
    useEffect(() => {
        if (!agentConfig) return;
        const provider = agentConfig.llm_provider;
        if (provider === "openai") {
            setSelected("openai:gpt-4.1");
        } else if (provider === "ollama") {
            const label = agentConfig.llm ?? "";
            // Extract model name from label like "Ollama qwen3:2b local (auto)"
            const match = label.match(/^Ollama\s+(\S+)\s+local/);
            setSelected(match ? `ollama:${match[1]}` : "ollama");
        }
    }, [agentConfig]);

    // Rolling avg LLM latency (last 5 turns)
    const recent = turns.slice(-5);
    const avgLlm = recent.length > 0
        ? Math.round(recent.reduce((s, t) => s + t.llm, 0) / recent.length)
        : null;

    const isAuto = agentConfig?.llm_auto === "true";

    function handleChange(value: string) {
        setSelected(value);
        const [provider, model] = value.split(":");
        const msg = JSON.stringify({ type: "llm_override", provider, model: model ?? null });
        onOverride(new TextEncoder().encode(msg));
    }

    const allOptions: { value: string; label: string }[] = [
        { value: "openai:gpt-4.1", label: "OpenAI gpt-4.1  ☁" },
        ...ollamaModels.map((m) => ({ value: `ollama:${m}`, label: `${m}  ⚡ local` })),
    ];

    if (ollamaError && ollamaModels.length === 0 && allOptions.length === 1) {
        // Only OpenAI available
    }

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

            <select
                value={selected}
                onChange={(e) => handleChange(e.target.value)}
                disabled={disabled}
                className="w-full text-[10px] font-mono rounded-lg px-2 py-1.5 appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--hud-border)",
                    color: "#a1a1aa",
                    outline: "none",
                }}
            >
                {allOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: "#09090b", color: "#a1a1aa" }}>
                        {opt.label}
                    </option>
                ))}
                {ollamaError && ollamaModels.length === 0 && (
                    <option disabled style={{ background: "#09090b", color: "#52525b" }}>
                        — Ollama offline —
                    </option>
                )}
            </select>
        </div>
    );
}

"use client";

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
}

const AGENT_CONFIG = [
    { label: "VAD", value: "Silero (local)" },
    { label: "Speech-to-Text", value: "Faster Whisper small.en (local)" },
    { label: "LLM", value: "OpenAI gpt-4.1-mini" },
    { label: "Text-to-Speech", value: "Kokoro ONNX am_michael (local)" },
    { label: "Turn Detection", value: "True" },
    { label: "Noise Cancellation", value: "False" },
];

function phaseColor(ms: number): string {
    if (ms < 200) return "text-emerald-400";
    if (ms < 500) return "text-yellow-400";
    return "text-red-400";
}

function overallColor(ms: number): string {
    if (ms < 700) return "text-emerald-400";
    if (ms < 1200) return "text-yellow-400";
    return "text-red-400";
}

function phaseDot(ms: number): string {
    if (ms < 200) return "bg-emerald-400";
    if (ms < 500) return "bg-yellow-400";
    return "bg-red-400";
}

const MAX_OVERALL_MS = 1500;

export default function MetricsPanel({ turns, agentConfig }: MetricsPanelProps) {
    const displayed = [...turns].reverse(); // most recent first
    const avg =
        turns.length > 0
            ? Math.round(turns.reduce((s, t) => s + t.overall, 0) / turns.length)
            : null;
    const best =
        turns.length > 0 ? Math.min(...turns.map((t) => t.overall)) : null;

    const config = agentConfig
        ? [
            { label: "VAD", value: agentConfig.vad },
            { label: "Speech-to-Text", value: agentConfig.stt },
            { label: "LLM", value: agentConfig.llm },
            { label: "Text-to-Speech", value: agentConfig.tts },
            { label: "Turn Detection", value: "True" },
            { label: "Noise Cancellation", value: "False" },
        ]
        : AGENT_CONFIG;

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Agent Configuration */}
            <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                    Agent Configuration
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {config.map(({ label, value }) => (
                        <div key={label} className="contents">
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                {label}
                            </span>
                            <span className="text-xs font-medium text-zinc-300 truncate">
                                {value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Latency */}
            <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                    Latency
                </p>

                {turns.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">
                        Waiting for first turn…
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {/* Header labels */}
                        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr] gap-x-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 px-1">
                            <span>#</span>
                            <span>STT</span>
                            <span>EOT</span>
                            <span>LLM</span>
                            <span>TTS</span>
                            <span>Total</span>
                        </div>

                        {displayed.map((turn, i) => {
                            const turnNumber = turns.length - i;
                            const barWidth = Math.min(
                                (turn.overall / MAX_OVERALL_MS) * 100,
                                100
                            );
                            const isLatest = i === 0;
                            return (
                                <div
                                    key={turnNumber}
                                    className={`relative rounded-xl px-3 py-2 overflow-hidden ${isLatest ? "bg-white/5" : ""}`}
                                >
                                    {/* Bar background */}
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-xl opacity-10"
                                        style={{
                                            width: `${barWidth}%`,
                                            backgroundColor:
                                                turn.overall < 700
                                                    ? "#34d399"
                                                    : turn.overall < 1200
                                                      ? "#facc15"
                                                      : "#f87171",
                                        }}
                                    />
                                    <div className="relative grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr] gap-x-2 items-center">
                                        <span className="text-xs text-zinc-600">
                                            {turnNumber}
                                        </span>
                                        {/* Phase pills */}
                                        {(
                                            [
                                                [turn.stt, "phaseColor"],
                                                [turn.eou, "phaseColor"],
                                                [turn.llm, "phaseColor"],
                                                [turn.tts, "phaseColor"],
                                            ] as [number, string][]
                                        ).map(([ms], idx) => (
                                            <span
                                                key={idx}
                                                className={`text-xs font-mono font-medium ${phaseColor(ms)}`}
                                            >
                                                <span
                                                    className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${phaseDot(ms)}`}
                                                />
                                                {ms}ms
                                            </span>
                                        ))}
                                        {/* Overall */}
                                        <span
                                            className={`text-xs font-mono font-bold ${overallColor(turn.overall)}`}
                                        >
                                            {turn.overall}ms
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Footer */}
                        <div className="mt-1 pt-2 border-t border-white/5 flex gap-4 text-[10px] text-zinc-500">
                            <span>
                                Avg{" "}
                                <span className="text-zinc-300 font-medium">
                                    {avg}ms
                                </span>
                            </span>
                            <span>
                                Best{" "}
                                <span className="text-zinc-300 font-medium">
                                    {best}ms
                                </span>
                            </span>
                            <span>
                                Turns{" "}
                                <span className="text-zinc-300 font-medium">
                                    {turns.length}
                                </span>
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

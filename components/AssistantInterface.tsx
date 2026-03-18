"use client";

import { useVoiceAssistant, TrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Settings, Power } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";

interface AssistantInterfaceProps {
    onDisconnect: () => void;
}

type VoiceState = "connecting" | "listening" | "speaking" | "thinking" | "initializing" | string;

export default function AssistantInterface({ onDisconnect }: AssistantInterfaceProps) {
    const { state, audioTrack } = useVoiceAssistant();
    const [showSettings, setShowSettings] = useState(false);

    const blobRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef<number>(0);
    const amplitudeRef = useRef<number>(0);
    const rafRef = useRef<number>(0);
    const prevStateRef = useRef<VoiceState>("");
    const prevStateTimeRef = useRef<number>(Date.now());
    const [isInterrupted, setIsInterrupted] = useState(false);

    useEffect(() => {
        // Interrupted state detection
        const now = Date.now();
        if (prevStateRef.current === "speaking" && state === "listening") {
            const elapsed = now - prevStateTimeRef.current;
            if (elapsed < 1500) {
                setIsInterrupted(true);
                setTimeout(() => setIsInterrupted(false), 800);
            }
        }
        prevStateRef.current = state;
        prevStateTimeRef.current = now;

        // Amplitude tracking via AudioContext
        let audioCtx: AudioContext | null = null;
        let analyser: AnalyserNode | null = null;
        let mediaSource: MediaStreamAudioSourceNode | null = null;
        let animFrameId: number;

        const setupAudio = () => {
            const mediaStreamTrack = audioTrack?.publication?.track?.mediaStreamTrack;
            if (!mediaStreamTrack) return;
            try {
                audioCtx = new AudioContext();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                const stream = new MediaStream([mediaStreamTrack]);
                mediaSource = audioCtx.createMediaStreamSource(stream);
                mediaSource.connect(analyser);
            } catch {
                audioCtx = null;
            }
        };

        setupAudio();

        const getPhaseStep = (s: VoiceState) => {
            if (s === "speaking") return 0.025;
            if (s === "listening") return 0.008;
            if (s === "thinking") return 0.010;
            return 0.003;
        };

        const buildBorderRadius = (s: VoiceState, phase: number, amp: number): string => {
            const range = s === "speaking" ? 12 + amp * 18 : s === "listening" ? 8 : s === "thinking" ? 6 : 3;
            const v = (base: number, freq: number, offset: number) =>
                Math.round(50 + Math.sin(phase * freq + offset) * range);
            return `${v(50,1,0)}% ${v(50,1.3,1)}% ${v(50,0.9,2)}% ${v(50,1.1,3)}% / ${v(50,1.2,0.5)}% ${v(50,0.8,1.5)}% ${v(50,1.4,2.5)}% ${v(50,1.0,3.5)}%`;
        };

        const getScale = (s: VoiceState, amp: number): string => {
            if (s === "speaking") return `scale(${1.0 + amp * 0.08})`;
            if (s === "listening") return "scale(1.0)";
            return "scale(0.95)";
        };

        const getGlow = (s: VoiceState, interrupted: boolean, amp: number): string => {
            if (interrupted) return "0 0 40px rgba(249,115,22,0.8), 0 0 80px rgba(249,115,22,0.3)";
            if (s === "speaking") return `0 0 ${20 + amp * 40}px rgba(16,185,129,0.6), 0 0 60px rgba(16,185,129,0.2)`;
            if (s === "listening") return "0 0 20px rgba(232,232,236,0.3)";
            if (s === "thinking") return "0 0 20px rgba(202,138,4,0.4)";
            return "none";
        };

        const animate = () => {
            // Update amplitude from analyser
            if (analyser) {
                const data = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                amplitudeRef.current = Math.min(1, avg / 128);
            } else {
                // Decay amplitude when no audio
                amplitudeRef.current = Math.max(0, amplitudeRef.current - 0.02);
            }

            phaseRef.current += getPhaseStep(state);
            const amp = amplitudeRef.current;
            const phase = phaseRef.current;

            if (blobRef.current) {
                blobRef.current.style.borderRadius = buildBorderRadius(state, phase, amp);
                blobRef.current.style.transform = getScale(state, amp);
                blobRef.current.style.boxShadow = getGlow(state, isInterrupted, amp);
            }

            animFrameId = requestAnimationFrame(animate);
        };

        animFrameId = requestAnimationFrame(animate);
        rafRef.current = animFrameId;

        return () => {
            cancelAnimationFrame(animFrameId);
            if (mediaSource) mediaSource.disconnect();
            if (audioCtx) audioCtx.close();
        };
    }, [state, audioTrack, isInterrupted]);

    const getBlobColor = (s: VoiceState, interrupted: boolean): string => {
        if (interrupted) return "#f97316"; // orange
        switch (s) {
            case "listening": return "#e8e8ec";   // silver
            case "speaking":  return "#10b981";   // vivid green
            case "thinking":  return "#ca8a04";   // amber
            default:          return "#18181c";   // near black (idle)
        }
    };

    const getStatusText = () => {
        switch (state) {
            case "connecting": return "Connecting to Volini...";
            case "listening": return "Volini is listening...";
            case "speaking": return "Volini is speaking...";
            case "thinking": return "Volini is thinking...";
            case "initializing": return "Initializing Agent...";
            default: return "Disconnected";
        }
    };

    const getStatusColor = () => {
        switch (state) {
            case "listening": return "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
            case "speaking": return "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]";
            case "thinking": return "bg-yellow-500 animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.3)] animate-pulse";
            default: return "bg-zinc-500 shadow-none";
        }
    };

    return (
        <div className="flex flex-col items-center w-full gap-8 py-4">

            {/* Blob Visualizer */}
            <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
                {/* Expanding glow ring — shown only when speaking */}
                {state === "speaking" && (
                    <div
                        ref={ringRef}
                        className="absolute"
                        style={{
                            width: 200,
                            height: 200,
                            borderRadius: "50%",
                            border: "1px solid rgba(16,185,129,0.3)",
                            animation: "ring-pulse 1.2s ease-out infinite",
                        }}
                    />
                )}

                {/* Morphing blob */}
                <div
                    ref={blobRef}
                    style={{
                        width: 160,
                        height: 160,
                        backgroundColor: getBlobColor(state, isInterrupted),
                        borderRadius: "50%",
                        transition: "background-color 600ms ease",
                        willChange: "border-radius, transform, box-shadow",
                    }}
                />
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-3 px-6 py-2 rounded-full glass-panel">
                <div className={clsx("w-2 h-2 rounded-full transition-all duration-300", getStatusColor())} />
                <span className="text-sm font-medium text-zinc-300">{getStatusText()}</span>
            </div>

            {/* Controls */}
            <div className="flex gap-4 w-full justify-center mt-4">

                <TrackToggle
                    source={Track.Source.Microphone}
                    showIcon={true}
                    className="group relative flex h-14 w-14 items-center justify-center rounded-2xl glass-panel hover:bg-white/10 transition-all active:scale-[0.96]"
                />

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                        "flex h-14 w-14 items-center justify-center rounded-2xl glass-panel hover:bg-white/10 transition-all active:scale-[0.96]",
                        showSettings && "bg-white/10"
                    )}
                >
                    <Settings className={clsx("w-6 h-6 transition-all duration-300", showSettings ? "text-white rotate-90" : "text-zinc-400")} />
                </button>

                <button
                    onClick={onDisconnect}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-[0.96] text-red-500 group"
                >
                    <Power className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* Settings Panel */}
            <div className={clsx(
                "w-full overflow-hidden transition-all duration-300 ease-in-out px-1",
                showSettings ? "max-h-48 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
            )}
            >
                <div className="w-full glass-panel rounded-2xl p-4 flex flex-col gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Microphone input</label>
                    <div className="bg-black/40 rounded-xl px-2 py-1">
                        {/* Using LiveKit's built-in device selector */}
                        <span className="text-sm font-medium text-zinc-500">Device Selection (Disabled)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

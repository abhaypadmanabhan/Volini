"use client";

import { useVoiceAssistant, BarVisualizer, TrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Settings, Volume2, Power } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

interface AssistantInterfaceProps {
    onDisconnect: () => void;
}

export default function AssistantInterface({ onDisconnect }: AssistantInterfaceProps) {
    const { state, audioTrack } = useVoiceAssistant();
    const [showSettings, setShowSettings] = useState(false);

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

            {/* Visualizer Area */}
            <div className="relative w-full aspect-[2/1] max-h-[160px] flex items-center justify-center rounded-2xl bg-black/40 border border-white/5 overflow-hidden group transition-all duration-500">

                {/* Glow effect based on state */}
                <div className={clsx("absolute inset-0 opacity-20 transition-colors duration-500",
                    state === "listening" ? "bg-green-500" :
                        state === "speaking" ? "bg-blue-500" :
                            state === "thinking" ? "bg-yellow-500" :
                                "bg-transparent"
                )} />

                {audioTrack ? (
                    <BarVisualizer
                        state={state}
                        barCount={7}
                        trackRef={audioTrack}
                        className="w-full h-full p-4"
                        options={{ minHeight: 4 }}
                    />
                ) : (
                    <div className="flex items-center gap-3 text-zinc-500 animate-pulse">
                        <Volume2 className="w-5 h-5 opacity-50" />
                        <span className="text-sm font-medium">Waiting for audio track...</span>
                    </div>
                )}
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

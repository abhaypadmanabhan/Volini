"use client";

import { useState } from "react";

interface TTSControlsProps {
    onConfig: (payload: Uint8Array) => void;
    disabled?: boolean;
}

const SEED = 42;

function buildPayload(voiceDescription: string, temperature: number): Uint8Array {
    return new TextEncoder().encode(
        JSON.stringify({ type: "tts_config", voice_description: voiceDescription, temperature, seed: SEED })
    );
}

export default function TTSControls({ onConfig, disabled }: TTSControlsProps) {
    const [gender, setGender] = useState<"male" | "female">("male");
    const [personality, setPersonality] = useState("");
    // slider: 0 = expressive (temp 0.9), 100 = consistent (temp 0.1)
    const [consistency, setConsistency] = useState(60);

    const BASE_VOICE = gender === "male"
        ? "Male voice, energetic car-enthusiast host. Fast-paced, clear American English."
        : "Female voice, energetic car-enthusiast host. Fast-paced, clear American English.";

    function send(overrides?: { gender?: "male" | "female"; personality?: string; consistency?: number }) {
        const g = overrides?.gender ?? gender;
        const p = overrides?.personality ?? personality;
        const c = overrides?.consistency ?? consistency;
        const temperature = parseFloat((0.9 - (c / 100) * 0.8).toFixed(2));
        const base = g === "male"
            ? "Male voice, energetic car-enthusiast host. Fast-paced, clear American English."
            : "Female voice, energetic car-enthusiast host. Fast-paced, clear American English.";
        const voiceDescription = p.trim() ? `${base} ${p.trim()}.` : base;
        onConfig(buildPayload(voiceDescription, temperature));
    }

    const inputStyle: React.CSSProperties = {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--hud-border)",
        borderRadius: "6px",
        color: "#d4d4d8",
        fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
        fontSize: "10px",
        padding: "4px 8px",
        outline: "none",
        width: "100%",
    };

    const btnBase: React.CSSProperties = {
        fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
        fontSize: "10px",
        padding: "3px 10px",
        borderRadius: "5px",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s",
        border: "1px solid var(--hud-border)",
    };

    const activeBtn: React.CSSProperties = {
        ...btnBase,
        background: "rgba(31,213,249,0.12)",
        color: "#1FD5F9",
        borderColor: "rgba(31,213,249,0.3)",
    };

    const inactiveBtn: React.CSSProperties = {
        ...btnBase,
        background: "rgba(255,255,255,0.03)",
        color: "#52525b",
    };

    return (
        <div
            style={{
                marginTop: "10px",
                padding: "10px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--hud-border)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                opacity: disabled ? 0.4 : 1,
            }}
        >
            <p style={{ fontFamily: "var(--font-geist-mono, ui-monospace, monospace)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.16em", color: "#3f3f46", margin: 0 }}>
                Voice
            </p>

            {/* Gender toggle */}
            <div style={{ display: "flex", gap: "6px" }}>
                <button
                    style={gender === "male" ? activeBtn : inactiveBtn}
                    disabled={disabled}
                    onClick={() => { setGender("male"); send({ gender: "male" }); }}
                >
                    Male ♂
                </button>
                <button
                    style={gender === "female" ? activeBtn : inactiveBtn}
                    disabled={disabled}
                    onClick={() => { setGender("female"); send({ gender: "female" }); }}
                >
                    Female ♀
                </button>
            </div>

            {/* Personality input */}
            <input
                style={inputStyle}
                placeholder="e.g. monotone robotic…"
                value={personality}
                disabled={disabled}
                onChange={(e) => setPersonality(e.target.value)}
                onBlur={() => send()}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />

            {/* Consistency slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-geist-mono, ui-monospace, monospace)", fontSize: "9px", color: "#3f3f46" }}>
                    <span>expressive</span>
                    <span>consistent</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={consistency}
                    disabled={disabled}
                    style={{ width: "100%", accentColor: "#1FD5F9" }}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        setConsistency(v);
                        send({ consistency: v });
                    }}
                />
            </div>
        </div>
    );
}

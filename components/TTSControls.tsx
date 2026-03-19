"use client";

import { useState } from "react";

interface TTSControlsProps {
    onConfig: (payload: Uint8Array) => void;
    disabled?: boolean;
}

const SEED = 42;

export default function TTSControls({ onConfig, disabled }: TTSControlsProps) {
    const [gender, setGender] = useState<"male" | "female">("male");
    const [personality, setPersonality] = useState("");
    // 0 = expressive (temp 0.9), 100 = consistent (temp 0.1)
    const [consistency, setConsistency] = useState(60);

    function send(overrides?: { gender?: "male" | "female"; personality?: string; consistency?: number }) {
        const g = overrides?.gender ?? gender;
        const p = overrides?.personality ?? personality;
        const c = overrides?.consistency ?? consistency;
        const temperature = parseFloat((0.9 - (c / 100) * 0.8).toFixed(2));
        const base = g === "male"
            ? "Male voice, energetic car-enthusiast host. Fast-paced, clear American English."
            : "Female voice, energetic car-enthusiast host. Fast-paced, clear American English.";
        const voiceDescription = p.trim() ? `${base} ${p.trim()}.` : base;
        onConfig(new TextEncoder().encode(
            JSON.stringify({ type: "tts_config", voice_description: voiceDescription, temperature, seed: SEED })
        ));
    }

    const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono, ui-monospace, monospace)" };

    function genderBtn(val: "male" | "female", label: string) {
        const active = gender === val;
        return (
            <button
                key={val}
                disabled={disabled}
                onClick={() => { setGender(val); send({ gender: val }); }}
                style={{
                    ...mono,
                    fontSize: "10px",
                    padding: "3px 10px",
                    borderRadius: "5px",
                    cursor: disabled ? "default" : "pointer",
                    transition: "all 0.15s",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: active ? "rgba(139,92,246,0.3)" : "var(--hud-border)",
                    background: active ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                    color: active ? "#8B5CF6" : "#52525b",
                }}
            >
                {label}
            </button>
        );
    }

    return (
        <div
            style={{
                marginTop: "10px",
                padding: "10px",
                background: "rgba(255,255,255,0.02)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--hud-border)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                opacity: disabled ? 0.4 : 1,
            }}
        >
            <p style={{ ...mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.16em", color: "#3f3f46", margin: 0 }}>
                Voice
            </p>

            <div style={{ display: "flex", gap: "6px" }}>
                {genderBtn("male", "Male ♂")}
                {genderBtn("female", "Female ♀")}
            </div>

            <input
                style={{
                    ...mono,
                    background: "rgba(255,255,255,0.04)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "var(--hud-border)",
                    borderRadius: "6px",
                    color: "#d4d4d8",
                    fontSize: "10px",
                    padding: "4px 8px",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                }}
                placeholder="e.g. monotone robotic…"
                value={personality}
                disabled={disabled}
                onChange={(e) => setPersonality(e.target.value)}
                onBlur={() => send()}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: "9px", color: "#3f3f46" }}>
                    <span>expressive</span>
                    <span>consistent</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={consistency}
                    disabled={disabled}
                    style={{ width: "100%", accentColor: "#8B5CF6" }}
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

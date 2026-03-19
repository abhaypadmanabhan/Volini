"use client";

import { useVoiceAssistant } from "@livekit/components-react";
import { useEffect, useRef } from "react";
import { clsx } from "clsx";

type AuraSize = "sm" | "md" | "lg" | "xl";

export interface AgentAudioVisualizerAuraProps {
    size?: AuraSize;
    color?: string;
    colorShift?: number; // 0–1, applied as hue-rotate on outer 2 rings
    state?: string;
    className?: string;
}

const SIZE_MAP: Record<AuraSize, number> = {
    sm: 120,
    md: 200,
    lg: 280,
    xl: 360,
};

// [scale relative to container, base opacity]
const RINGS: [number, number][] = [
    [1.00, 0.06],
    [0.82, 0.10],
    [0.65, 0.16],
    [0.50, 0.22],
    [0.37, 0.30],
];

export default function AgentAudioVisualizerAura({
    size = "md",
    color = "#1FD5F9",
    colorShift = 0,
    state,
    className,
}: AgentAudioVisualizerAuraProps) {
    const { state: voiceState, audioTrack } = useVoiceAssistant();
    const currentState = state ?? voiceState;

    const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
    const innerRef = useRef<HTMLDivElement>(null);
    const scanRef = useRef<HTMLDivElement>(null);
    const amplitudeRef = useRef(0);
    const phaseRef = useRef(0);

    const px = SIZE_MAP[size];

    useEffect(() => {
        let audioCtx: AudioContext | null = null;
        let analyser: AnalyserNode | null = null;
        let mediaSource: MediaStreamAudioSourceNode | null = null;
        let animId: number;

        const setupAudio = () => {
            const track = audioTrack?.publication?.track?.mediaStreamTrack;
            if (!track) return;
            try {
                audioCtx = new AudioContext();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                const stream = new MediaStream([track]);
                mediaSource = audioCtx.createMediaStreamSource(stream);
                mediaSource.connect(analyser);
            } catch {
                audioCtx = null;
            }
        };

        setupAudio();

        const animate = () => {
            if (analyser) {
                const data = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                amplitudeRef.current = Math.min(1, avg / 100);
            } else {
                amplitudeRef.current = Math.max(0, amplitudeRef.current - 0.012);
            }

            const phaseStep =
                currentState === "speaking"    ? 0.030 :
                currentState === "listening"   ? 0.010 :
                currentState === "thinking"    ? 0.014 :
                0.004;

            phaseRef.current += phaseStep;
            const phase = phaseRef.current;
            const amp = amplitudeRef.current;

            const isSpeaking  = currentState === "speaking";
            const isListening = currentState === "listening";
            const isThinking  = currentState === "thinking";
            const isActive    = isSpeaking || isListening || isThinking;

            // Update each ring
            ringRefs.current.forEach((ring, i) => {
                if (!ring) return;

                const ringPhase = phase + i * 0.45;
                const pulse = Math.sin(ringPhase) * 0.5 + 0.5; // 0–1

                let scale = 1;
                let opacity = RINGS[i][1];
                let borderColor = color;

                if (isSpeaking) {
                    scale = 1 + amp * (0.10 + i * 0.035) + pulse * 0.025;
                    opacity = 0.18 + amp * 0.55 + pulse * 0.08;
                } else if (isListening) {
                    const active = i >= 2;
                    scale = active ? 1 + pulse * 0.025 : 1;
                    opacity = active ? 0.18 + pulse * 0.12 : RINGS[i][1];
                } else if (isThinking) {
                    scale = 1 + pulse * 0.04;
                    opacity = 0.12 + pulse * 0.18;
                    borderColor = `rgba(251, 191, 36, ${opacity + 0.2})`;
                } else {
                    // Idle: slow single pulse on outermost ring only
                    scale = i === 0 ? 1 + pulse * 0.015 : 1;
                    opacity = i === 0 ? 0.08 + pulse * 0.06 : RINGS[i][1] * 0.7;
                }

                ring.style.transform = `scale(${scale.toFixed(4)})`;
                ring.style.opacity = String(Math.min(opacity, 0.9).toFixed(3));
                ring.style.borderColor = borderColor === color ? "" : borderColor;

                // Hue shift outer 2 rings for depth
                if (i < 2 && colorShift > 0) {
                    ring.style.filter = `hue-rotate(${(colorShift * 180).toFixed(1)}deg)`;
                }
            });

            // Inner glow circle
            if (innerRef.current) {
                const glowR = isSpeaking ? Math.round(18 + amp * 32) : isActive ? 14 : 8;
                const glowA = isSpeaking ? 0.28 + amp * 0.45 : isListening ? 0.18 : 0.10;
                innerRef.current.style.boxShadow =
                    `0 0 ${glowR}px rgba(31,213,249,${glowA.toFixed(3)}), ` +
                    `0 0 ${glowR * 2}px rgba(31,213,249,${(glowA * 0.35).toFixed(3)})`;
                innerRef.current.style.opacity = String(isActive ? 0.85 : 0.45);
            }

            // Scan line — visible only when thinking
            if (scanRef.current) {
                scanRef.current.style.display = isThinking ? "block" : "none";
            }

            animId = requestAnimationFrame(animate);
        };

        animId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animId);
            if (mediaSource) mediaSource.disconnect();
            if (audioCtx) audioCtx.close();
        };
    }, [currentState, audioTrack, colorShift, color]);

    return (
        <div
            className={clsx("relative flex items-center justify-center", className)}
            style={{ width: px, height: px }}
        >
            {/* Concentric rings */}
            {RINGS.map(([scale, baseOpacity], i) => (
                <div
                    key={i}
                    ref={(el) => { ringRefs.current[i] = el; }}
                    className="absolute rounded-full"
                    style={{
                        width: `${scale * 100}%`,
                        height: `${scale * 100}%`,
                        border: `1px solid ${color}`,
                        opacity: baseOpacity,
                        willChange: "transform, opacity",
                        transition: "border-color 0.4s ease",
                    }}
                />
            ))}

            {/* Scan line overlay — thinking state */}
            <div
                ref={scanRef}
                className="scan-line-overlay"
                style={{ display: "none", borderRadius: "50%", overflow: "hidden" }}
            />

            {/* Inner glow circle */}
            <div
                ref={innerRef}
                className="absolute rounded-full"
                style={{
                    width: "27%",
                    height: "27%",
                    backgroundColor: color,
                    opacity: 0.10,
                    willChange: "box-shadow, opacity",
                    transition: "opacity 0.4s ease",
                }}
            />
        </div>
    );
}

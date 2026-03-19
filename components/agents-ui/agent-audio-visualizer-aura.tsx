"use client";

import { useVoiceAssistant, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

type AuraSize = "sm" | "md" | "lg" | "xl";

export interface AgentAudioVisualizerAuraProps {
    size?: AuraSize;
    color?: string;
    colorShift?: number;
    state?: string;
    className?: string;
}

const BAR_COUNT = 48;

const SIZE_MAP: Record<AuraSize, number> = {
    sm: 120,
    md: 200,
    lg: 280,
    xl: 360,
};

const STATE_COLOR: Record<string, string> = {
    listening:   "#22c55e",
    thinking:    "#f59e0b",
    speaking:    "#8B5CF6",
    interrupted: "#f97316",
};

export default function AgentAudioVisualizerAura({
    size = "md",
    color = "#8B5CF6",
    colorShift: _colorShift = 0, // accepted for API compatibility, not used in new design
    state,
    className,
}: AgentAudioVisualizerAuraProps) {
    const { state: voiceState, audioTrack } = useVoiceAssistant();
    const { localParticipant } = useLocalParticipant();
    const currentState = state ?? voiceState;
    const activeColor = STATE_COLOR[currentState] ?? color;

    const px = SIZE_MAP[size];
    const cx = px / 2;
    const cy = px / 2;

    // Radii for each layer
    const orbitRadius = px * 0.48;
    const arcRadius   = px * 0.38;
    const barStart    = px * 0.33;
    const barEnd      = px * 0.47;
    const orbSize     = px * 0.27;

    // Refs for direct DOM manipulation (frequency bars)
    const lineRefs = useRef<(SVGLineElement | null)[]>([]);

    // Arc progress ring state (throttled at ~10fps)
    const [arcOffset, setArcOffset] = useState(0);

    // Animation / audio refs
    const rafRef       = useRef<number>(0);
    const frameCounter = useRef(0);
    const phaseRef     = useRef(0);

    // Precompute bar angles
    const barAngles = Array.from({ length: BAR_COUNT }, (_, i) =>
        (i / BAR_COUNT) * 2 * Math.PI
    );

    // Inner orb framer-motion targets per state
    const orbTargets = (() => {
        switch (currentState) {
            case "speaking":
                return {
                    scale: 1.15,
                    opacity: 0.9,
                    boxShadow: `0 0 32px 8px ${activeColor}99, 0 0 64px 16px ${activeColor}44`,
                };
            case "listening":
                return {
                    scale: 1.05,
                    opacity: 0.75,
                    boxShadow: `0 0 20px 6px ${activeColor}77, 0 0 40px 10px ${activeColor}33`,
                };
            case "thinking":
                return {
                    scale: 1.0,
                    opacity: 0.6,
                    boxShadow: `0 0 14px 4px ${activeColor}55, 0 0 28px 8px ${activeColor}22`,
                };
            default: // idle
                return {
                    scale: 0.85,
                    opacity: 0.35,
                    boxShadow: `0 0 8px 2px ${activeColor}33, 0 0 16px 4px ${activeColor}11`,
                };
        }
    })();

    // Orbit ring rotation speed
    const orbitDuration = currentState === "speaking" ? 6 : 15;

    // Arc circumference
    const arcCircumference = 2 * Math.PI * arcRadius;

    // rAF loop for frequency bars + arc offset
    useEffect(() => {
        let audioCtx: AudioContext | null = null;
        let mediaSource: MediaStreamAudioSourceNode | null = null;

        const micTrack = localParticipant
            ?.getTrackPublication(Track.Source.Microphone)
            ?.track?.mediaStreamTrack;

        const setupAudio = (): AnalyserNode | null => {
            const track =
                currentState === "listening"
                    ? micTrack
                    : audioTrack?.publication?.track?.mediaStreamTrack;
            if (!track) return null;
            try {
                audioCtx = new AudioContext();
                const node = audioCtx.createAnalyser();
                node.fftSize = 256;
                const stream = new MediaStream([track]);
                mediaSource = audioCtx.createMediaStreamSource(stream);
                mediaSource.connect(node);
                return node;
            } catch {
                audioCtx = null;
                return null;
            }
        };

        const activeAnalyser = setupAudio();
        const binCount = activeAnalyser ? activeAnalyser.frequencyBinCount : 128;
        const fftData = new Uint8Array(binCount);
        const step = binCount / BAR_COUNT;

        const animate = () => {
            frameCounter.current += 1;
            phaseRef.current += 0.04;
            const phase = phaseRef.current;

            if (activeAnalyser) {
                activeAnalyser.getByteFrequencyData(fftData);
            }

            // Update frequency bars via direct DOM
            for (let i = 0; i < BAR_COUNT; i++) {
                const line = lineRefs.current[i];
                if (!line) continue;

                const rawVal = activeAnalyser
                    ? fftData[Math.floor(i * step)]
                    : 0;
                // Normalize 0–255 → 0–1; add gentle idle flicker
                const idleFlicker = (Math.sin(phase + i * 0.3) * 0.5 + 0.5) * 0.04;
                const norm = activeAnalyser
                    ? Math.min(1, rawVal / 255) * 0.95 + idleFlicker
                    : idleFlicker;

                const angle = barAngles[i];
                const cosA  = Math.cos(angle);
                const sinA  = Math.sin(angle);

                const innerR = barStart;
                const outerR = barStart + (barEnd - barStart) * norm;

                line.setAttribute("x1", String((cx + cosA * innerR).toFixed(2)));
                line.setAttribute("y1", String((cy + sinA * innerR).toFixed(2)));
                line.setAttribute("x2", String((cx + cosA * outerR).toFixed(2)));
                line.setAttribute("y2", String((cy + sinA * outerR).toFixed(2)));
                line.style.opacity = String((0.1 + norm * 0.9).toFixed(3));
            }

            // Throttle arc offset update to ~10fps (every 6 frames at 60fps)
            if (frameCounter.current % 6 === 0) {
                const avgAmp = activeAnalyser
                    ? Array.from(fftData).reduce((a, b) => a + b, 0) / fftData.length / 255
                    : 0;

                let newOffset: number;
                if (currentState === "speaking") {
                    // Fill driven by amplitude (0–100%)
                    newOffset = arcCircumference * (1 - avgAmp);
                } else if (currentState === "listening") {
                    // Slow 0–100% pulse cycling every 2s (~120 frames at 60fps)
                    const t = (frameCounter.current % 120) / 120;
                    newOffset = arcCircumference * (1 - t);
                } else if (currentState === "thinking") {
                    // Partial arc (40%) rotating — offset just controls fill amount
                    newOffset = arcCircumference * 0.6;
                } else {
                    newOffset = arcCircumference; // fully hidden
                }
                setArcOffset(newOffset);
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafRef.current);
            if (mediaSource) mediaSource.disconnect();
            if (audioCtx) audioCtx.close();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentState, audioTrack, localParticipant]);


    return (
        <div
            className={clsx("relative flex items-center justify-center", className)}
            style={{ width: px, height: px }}
        >
            {/* ── Layer 1: Outer orbit ring ── */}
            <motion.div
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                }}
                animate={{ rotate: 360 }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: orbitDuration,
                }}
            >
                <svg
                    style={{ position: "absolute", width: "100%", height: "100%" }}
                    viewBox={`0 0 ${px} ${px}`}
                    overflow="visible"
                >
                    <circle
                        cx={cx}
                        cy={cy}
                        r={orbitRadius}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth={1}
                        strokeDasharray="4 8"
                        strokeOpacity={0.25}
                    />
                </svg>
            </motion.div>

            {/* ── Layer 2: Frequency ring (48 radial bars) ── */}
            <svg
                style={{ position: "absolute", width: "100%", height: "100%" }}
                viewBox={`0 0 ${px} ${px}`}
                overflow="visible"
            >
                {barAngles.map((angle, i) => {
                    const cosA = Math.cos(angle);
                    const sinA = Math.sin(angle);
                    return (
                        <line
                            key={i}
                            ref={(el) => { lineRefs.current[i] = el; }}
                            x1={(cx + cosA * barStart).toFixed(2)}
                            y1={(cy + sinA * barStart).toFixed(2)}
                            x2={(cx + cosA * barStart).toFixed(2)}
                            y2={(cy + sinA * barStart).toFixed(2)}
                            stroke={activeColor}
                            strokeWidth={2}
                            strokeLinecap="round"
                            opacity={0.1}
                        />
                    );
                })}
            </svg>

            {/* ── Layer 3: Arc progress ring ── */}
            <svg
                style={{ position: "absolute", width: "100%", height: "100%" }}
                viewBox={`0 0 ${px} ${px}`}
                overflow="visible"
            >
                {/* Background arc track */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={arcRadius}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={1.5}
                    strokeOpacity={0.12}
                />
                {/* Animated arc — rotate the group for thinking state */}
                <motion.g
                    animate={currentState === "thinking" ? { rotate: 360 } : { rotate: 0 }}
                    transition={
                        currentState === "thinking"
                            ? { repeat: Infinity, ease: "linear", duration: 8 }
                            : { duration: 0.5 }
                    }
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                >
                    <circle
                        cx={cx}
                        cy={cy}
                        r={arcRadius}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeOpacity={0.7}
                        strokeDasharray={arcCircumference}
                        strokeDashoffset={arcOffset}
                        style={{
                            transformOrigin: `${cx}px ${cy}px`,
                            transform: "rotate(-90deg)",
                            transition: "stroke-dashoffset 0.1s linear, stroke 0.4s ease",
                        }}
                    />
                </motion.g>
            </svg>

            {/* ── Layer 4: Inner glow orb ── */}
            <motion.div
                style={{
                    position: "absolute",
                    width: orbSize,
                    height: orbSize,
                    borderRadius: "50%",
                    backgroundColor: activeColor,
                    willChange: "transform, opacity, box-shadow",
                }}
                animate={{
                    scale: orbTargets.scale,
                    opacity: orbTargets.opacity,
                    boxShadow: orbTargets.boxShadow,
                }}
                transition={{
                    duration: 0.5,
                    ease: "easeInOut",
                    ...(currentState === "thinking"
                        ? {
                              repeat: Infinity,
                              repeatType: "reverse" as const,
                              duration: 1.2,
                          }
                        : {}),
                }}
            />
        </div>
    );
}

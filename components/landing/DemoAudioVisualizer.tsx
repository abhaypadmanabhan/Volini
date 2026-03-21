"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { clsx } from "clsx"

type AuraSize = "sm" | "md" | "lg" | "xl"

export interface DemoAudioVisualizerProps {
  size?: AuraSize
  state?: "idle" | "listening" | "thinking" | "speaking"
  className?: string
}

const BAR_COUNT = 48

const SIZE_MAP: Record<AuraSize, number> = {
  sm: 120,
  md: 200,
  lg: 280,
  xl: 360,
}

const STATE_COLOR: Record<string, string> = {
  idle: "#8B5CF6",
  listening: "#22c55e",
  thinking: "#f59e0b",
  speaking: "#EC4899",
}

export default function DemoAudioVisualizer({
  size = "xl",
  state = "idle",
  className,
}: DemoAudioVisualizerProps) {
  const px = SIZE_MAP[size]
  const cx = px / 2
  const cy = px / 2

  const orbitRadius = px * 0.48
  const arcRadius = px * 0.38
  const barStart = px * 0.33
  const barEnd = px * 0.47
  const orbSize = px * 0.27

  const lineRefs = useRef<(SVGLineElement | null)[]>([])
  const rafRef = useRef<number>(0)
  const phaseRef = useRef(0)

  const [arcOffset, setArcOffset] = useState(0)
  const activeColor = STATE_COLOR[state] ?? STATE_COLOR.idle

  const barAngles = Array.from({ length: BAR_COUNT }, (_, i) =>
    (i / BAR_COUNT) * 2 * Math.PI
  )

  const orbTargets = (() => {
    switch (state) {
      case "speaking":
        return {
          scale: 1.15,
          opacity: 0.9,
          boxShadow: `0 0 32px 8px ${activeColor}99, 0 0 64px 16px ${activeColor}44`,
        }
      case "listening":
        return {
          scale: 1.05,
          opacity: 0.75,
          boxShadow: `0 0 20px 6px ${activeColor}77, 0 0 40px 10px ${activeColor}33`,
        }
      case "thinking":
        return {
          scale: 1.0,
          opacity: 0.6,
          boxShadow: `0 0 14px 4px ${activeColor}55, 0 0 28px 8px ${activeColor}22`,
        }
      default:
        return {
          scale: 0.85,
          opacity: 0.35,
          boxShadow: `0 0 8px 2px ${activeColor}33, 0 0 16px 4px ${activeColor}11`,
        }
    }
  })()

  const orbitDuration = state === "speaking" ? 6 : 15
  const arcCircumference = 2 * Math.PI * arcRadius

  useEffect(() => {
    let frameCounter = 0

    const animate = () => {
      frameCounter += 1
      phaseRef.current += 0.04
      const phase = phaseRef.current

      for (let i = 0; i < BAR_COUNT; i++) {
        const line = lineRefs.current[i]
        if (!line) continue

        let norm: number
        if (state === "speaking") {
          const rawVal = Math.sin(phase + i * 0.2) * 0.5 + 0.5
          norm = rawVal * 0.8 + 0.1
        } else if (state === "listening") {
          const rawVal = Math.sin(phase * 0.5 + i * 0.1) * 0.5 + 0.5
          norm = rawVal * 0.4 + 0.1
        } else if (state === "thinking") {
          const rawVal = Math.sin(phase * 2 + i * 0.3) * 0.5 + 0.5
          norm = rawVal * 0.3 + 0.05
        } else {
          const idleFlicker = Math.sin(phase + i * 0.3) * 0.5 + 0.5
          norm = idleFlicker * 0.08 + 0.02
        }

        const angle = barAngles[i]
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)

        const innerR = barStart
        const outerR = barStart + (barEnd - barStart) * norm

        line.setAttribute("x1", String((cx + cosA * innerR).toFixed(2)))
        line.setAttribute("y1", String((cy + sinA * innerR).toFixed(2)))
        line.setAttribute("x2", String((cx + cosA * outerR).toFixed(2)))
        line.setAttribute("y2", String((cy + sinA * outerR).toFixed(2)))
        line.style.opacity = String((0.1 + norm * 0.9).toFixed(3))
      }

      if (frameCounter % 6 === 0) {
        let newOffset: number
        if (state === "speaking") {
          newOffset = arcCircumference * 0.3
        } else if (state === "listening") {
          const t = (frameCounter % 120) / 120
          newOffset = arcCircumference * (1 - t)
        } else if (state === "thinking") {
          newOffset = arcCircumference * 0.6
        } else {
          newOffset = arcCircumference
        }
        setArcOffset(newOffset)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [state, barAngles, barEnd, barStart, cx, cy, arcCircumference])

  return (
    <div
      className={clsx("relative flex items-center justify-center", className)}
      style={{ width: px, height: px }}
    >
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

      <svg
        style={{ position: "absolute", width: "100%", height: "100%" }}
        viewBox={`0 0 ${px} ${px}`}
        overflow="visible"
      >
        {barAngles.map((_, i) => (
          <line
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el
            }}
            x1={(cx + Math.cos(barAngles[i]) * barStart).toFixed(2)}
            y1={(cy + Math.sin(barAngles[i]) * barStart).toFixed(2)}
            x2={(cx + Math.cos(barAngles[i]) * barStart).toFixed(2)}
            y2={(cy + Math.sin(barAngles[i]) * barStart).toFixed(2)}
            stroke={activeColor}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.1}
          />
        ))}
      </svg>

      <svg
        style={{ position: "absolute", width: "100%", height: "100%" }}
        viewBox={`0 0 ${px} ${px}`}
        overflow="visible"
      >
        <circle
          cx={cx}
          cy={cy}
          r={arcRadius}
          fill="none"
          stroke={activeColor}
          strokeWidth={1.5}
          strokeOpacity={0.12}
        />
        <motion.g
          animate={
            state === "thinking"
              ? { rotate: 360 }
              : { rotate: 0 }
          }
          transition={
            state === "thinking"
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
          ...(state === "thinking"
            ? {
                repeat: Infinity,
                repeatType: "reverse" as const,
                duration: 1.2,
              }
            : {}),
        }}
      />
    </div>
  )
}

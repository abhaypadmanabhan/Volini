"use client";

import { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ShineBorderProps {
  children: ReactNode;
  className?: string;
  color?: string | string[];
  duration?: number;
  borderWidth?: number;
  borderRadius?: number;
}

/**
 * Animated gradient border that sweeps around the perimeter.
 * Inspired by cult-ui shine-border pattern.
 */
export function ShineBorder({
  children,
  className,
  color = ["#8B5CF6", "#EC4899", "#8B5CF6"],
  duration = 8,
  borderWidth = 1,
  borderRadius = 16,
}: ShineBorderProps) {
  const gradient = Array.isArray(color) ? color.join(", ") : color;

  return (
    <div
      className={cn("relative", className)}
      style={
        {
          "--shine-duration": `${duration}s`,
          "--border-width": `${borderWidth}px`,
          "--border-radius": `${borderRadius}px`,
          "--shine-gradient": `conic-gradient(from var(--angle), transparent 0deg, ${gradient}, transparent 60deg)`,
          borderRadius: `var(--border-radius)`,
        } as CSSProperties
      }
    >
      {/* Animated border layer */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          padding: `${borderWidth}px`,
          background: `conic-gradient(from 0deg, transparent 0deg, ${gradient}, transparent 60deg)`,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: `shine-spin ${duration}s linear infinite`,
        }}
      />
      {children}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

interface SlidingNumberProps {
  value: number | null;
  className?: string;
}

/**
 * Animates a number rolling up/down when its value changes.
 * Inspired by cult-ui sliding-number pattern.
 */
export function SlidingNumber({ value, className }: SlidingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number>(value ?? 0);

  useEffect(() => {
    if (value === null || !ref.current) return;
    const from = prev.current;
    const to = value;
    prev.current = to;

    const ctrl = animate(from, to, {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });

    return () => ctrl.stop();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value ?? 0}
    </span>
  );
}

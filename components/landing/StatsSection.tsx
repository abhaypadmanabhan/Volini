"use client"

import * as React from "react"
import { motion, useInView } from "framer-motion"
import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
  textClassName?: string
}

export function AnimatedNumber({
  value,
  suffix = "",
  prefix = "",
  duration = 2000,
  className,
  textClassName,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true
      const startTime = Date.now()
      const startValue = 0

      const animate = () => {
        const now = Date.now()
        const progress = Math.min((now - startTime) / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = Math.floor(startValue + (value - startValue) * easeOut)

        setDisplayValue(current)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setDisplayValue(value)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [isInView, value, duration])

  return (
    <span ref={ref} className={className}>
      <span className={textClassName}>
        {prefix}
        {displayValue.toLocaleString()}
        {suffix}
      </span>
    </span>
  )
}

interface StatItemProps {
  value: number
  suffix?: string
  prefix?: string
  label: string
  delay?: number
}

function StatItem({ value, suffix, prefix, label, delay = 0 }: StatItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 blur-[40px] bg-violet-500/30" />
        <AnimatedNumber
          value={value}
          suffix={suffix}
          prefix={prefix}
          duration={2500}
          textClassName="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
        />
      </div>
      <p className="mt-3 text-sm font-medium uppercase tracking-wider text-white/50 sm:text-base">
        {label}
      </p>
    </motion.div>
  )
}

export default function StatsSection() {
  const stats: StatItemProps[] = [
    {
      value: 50000,
      suffix: "+",
      label: "Vehicle Models",
      delay: 0,
    },
    {
      value: 1,
      suffix: "s",
      prefix: "<",
      label: "Response Latency",
      delay: 0.1,
    },
    {
      value: 125,
      suffix: "+",
      label: "Years of Knowledge",
      delay: 0.2,
    },
    {
      value: 100,
      suffix: "%",
      label: "Privacy-First",
      delay: 0.3,
    },
  ]

  return (
    <section className="relative bg-[#09090b] py-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8B5CF610_1px,transparent_1px),linear-gradient(to_bottom,#8B5CF610_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/10 via-transparent to-transparent"
          aria-hidden
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Built for Car People
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-white/60">
            Not a generic voice assistant with a car skin. A car-obsessed AI
            that actually knows its stuff.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <StatItem key={index} {...stat} />
          ))}
        </div>
      </div>

      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
        aria-hidden
      />
    </section>
  )
}

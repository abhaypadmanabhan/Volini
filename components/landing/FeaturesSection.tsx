"use client"

import * as React from "react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Car, Zap, Shield, Globe } from "lucide-react"

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8 transition-all duration-300 hover:border-violet-500/50 hover:bg-gradient-to-b hover:from-violet-500/10 hover:to-transparent">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(139,92,246,0.1)_50%,transparent_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10">
          <div className="mb-5 inline-flex rounded-xl bg-violet-500/20 p-4 transition-colors duration-300 group-hover:bg-violet-500/30">
            <div className="text-violet-400 transition-transform duration-300 group-hover:scale-110">
              {icon}
            </div>
          </div>

          <h3 className="mb-3 text-xl font-semibold text-white group-hover:text-violet-200 transition-colors">
            {title}
          </h3>

          <p className="text-sm leading-relaxed text-white/60 group-hover:text-white/70 transition-colors">
            {description}
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet-500/20 to-pink-500/20 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-50" aria-hidden />
    </motion.div>
  )
}

export default function FeaturesSection() {
  const features: FeatureCardProps[] = [
    {
      icon: <Car className="h-6 w-6" />,
      title: "Speaks Fluent Car",
      description:
        "Every model, every era, every manufacturer — from AMC to Zenvo. Volini's knowledge runs deeper than any salesman. Ask about the 1969 Boss 302 or the latest Porsche 911 — get answers like you're talking to a fellow gearhead.",
      delay: 0,
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Answers Before You Finish Asking",
      description:
        "Sub-second latency. Volini responds faster than you can think of your next question. No loading spinners, no 'let me check that for you.' Just instant, fluid conversation.",
      delay: 0.1,
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "No Games. Just Truth.",
      description:
        "Dealer markups, useless add-ons, hidden fees — Volini tells you what it's really worth. Not what the salesperson wants you to hear. The honest analysis you deserve.",
      delay: 0.2,
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Built for Privacy",
      description:
        "Runs locally. Your questions stay private. No cloud dependency, no data harvesting. Whether you're researching a purchase or just geeking out — what you ask Volini stays between you and your car.",
      delay: 0.3,
    },
  ]

  return (
    <section className="relative bg-[#09090b] py-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]"
          aria-hidden
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="border-violet-500/50 bg-violet-500/10 text-violet-300 text-sm px-4 py-1 mb-4"
          >
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            What Volini Brings to Your Showroom
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-white/60">
            More than answers. A complete customer experience transformation.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>

      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent"
        aria-hidden
      />
    </section>
  )
}

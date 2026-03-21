"use client"

import * as React from "react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Store, Wrench, Sparkles } from "lucide-react"

interface UseCaseProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}

function UseCaseCard({ icon, title, description, delay }: UseCaseProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-pink-500/30">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 p-4 transition-transform duration-300 group-hover:scale-105">
            <div className="text-pink-400">{icon}</div>
          </div>
          <div className="flex-1">
            <h3 className="mb-2 text-xl font-semibold text-white group-hover:text-pink-200 transition-colors">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-white/60 group-hover:text-white/70 transition-colors">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-b from-pink-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
    </motion.div>
  )
}

export default function B2BSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const useCases: UseCaseProps[] = [
    {
      icon: <Store className="h-6 w-6" />,
      title: "Showroom Experience",
      description:
        "Customer sits in a new BMW X5, asks 'How does this compare to the Mercedes GLE?' — Volini answers instantly with specs, driving dynamics, and real-world comparisons. Builds confidence. Closes gaps. Turns browsers into buyers.",
      delay: 0,
    },
    {
      icon: <Wrench className="h-6 w-6" />,
      title: "Service Center",
      description:
        "'Why is my check engine light on?' — explained in plain English, not mechanic-speak. Customers leave understanding their car, not confused. Reduce call center volume by 40% while increasing customer satisfaction.",
      delay: 0.1,
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Events & Auto Shows",
      description:
        "Auto shows, product launches, showroom events — any question about any vehicle on the floor, answered in real-time. Transform passive browsing into active discovery. Your cars, explained by an expert that never takes a break.",
      delay: 0.2,
    },
  ]

  return (
    <section ref={sectionRef} className="relative bg-[#09090b] py-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_100%,rgba(236,72,153,0.1),transparent)]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(236,72,153,0.03)_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <Badge
            variant="outline"
            className="border-pink-500/50 bg-pink-500/10 text-pink-300 text-sm px-4 py-1 mb-4"
          >
            For Auto Companies
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Your Showroom, Transformed
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-white/60">
            Volini isn't just another voice assistant. It's the expert your
            customers didn't know they needed — building trust, answering the
            hard questions, and turning curiosity into confidence.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
          {useCases.map((useCase, index) => (
            <UseCaseCard key={index} {...useCase} delay={index * 0.1} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-6">
            <p className="text-sm uppercase tracking-widest text-white/40">
              Piloting with select partners
            </p>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-violet-500 animate-pulse" />
              <p className="font-mono text-sm text-white/60">
                Coming to showrooms near you — 2025
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-2 border-pink-500/50 text-pink-400 hover:bg-pink-500/10 transition-colors"
            >
              Partner with us
            </Button>
          </div>
        </motion.div>
      </div>

      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent"
        aria-hidden
      />
    </section>
  )
}

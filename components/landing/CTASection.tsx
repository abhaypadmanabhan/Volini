"use client"

import * as React from "react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowRight, Github } from "lucide-react"

export default function CTASection() {
  const router = useRouter()
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const handleWakeVolini = () => {
    router.push("/")
  }

  return (
    <section ref={sectionRef} className="relative bg-[#09090b] py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 via-[#09090b] to-[#09090b]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8B5CF610_1px,transparent_1px),linear-gradient(to_bottom,#8B5CF610_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_50%,#000_40%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ready to give your customers an
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              experience they won't forget?
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
            No more "let me check with my manager." No more vague answers. No
            more leaving customers confused. Just clarity, confidence, and
            conversations that sell.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-violet-500 via-pink-500 to-violet-500 opacity-50 blur transition-all duration-500 group-hover:opacity-75 group-hover:blur-lg" />
              <Button
                onClick={handleWakeVolini}
                size="lg"
                className="relative bg-[#09090b] hover:bg-[#1a1a1b] text-white font-semibold px-10 py-8 text-lg transition-all duration-200 hover:scale-105 border-0"
              >
                <span className="flex items-center gap-3">
                  Wake up Volini
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </div>

            <Button
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() =>
                window.open("https://github.com", "_blank")
              }
            >
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Button>
          </div>

          <p className="mt-8 text-sm text-white/40">
            Free to try. No credit card required.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent"
        aria-hidden
      />
    </section>
  )
}

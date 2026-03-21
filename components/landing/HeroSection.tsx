"use client"

import * as React from "react"
import { Dithering } from "@paper-design/shaders-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

const MemoizedDithering = React.memo(Dithering)

interface HeroSectionProps {
  className?: string
}

export default function HeroSection({ className }: HeroSectionProps) {
  const scrollToDemo = () => {
    const demoSection = document.getElementById("demo")
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section
      className={`relative min-h-screen w-full overflow-hidden bg-[#09090b] ${className || ""}`}
    >
      <div className="absolute inset-0 z-0">
        <Dithering
          colorBack="#09090b"
          colorFront="#8B5CF6"
          shape="swirl"
          type="4x4"
          size={2}
          speed={0.8}
          scale={0.6}
          className="absolute inset-0"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 0%, #09090b 70%)",
          }}
        />
      </div>

      <div
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(139, 92, 246, 0.15) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
        }}
      />

      <div className="relative z-10 container mx-auto px-4">
        <div className="flex min-h-screen flex-col items-center justify-center py-24">
          <motion.div
            className="flex flex-col items-center text-center gap-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.12, delayChildren: 0.2 },
              },
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              <Badge
                variant="outline"
                className="border-violet-500/50 bg-violet-500/10 text-violet-300 text-sm px-4 py-1.5 backdrop-blur-sm"
              >
                Introducing Volini
              </Badge>
            </motion.div>

            <motion.h1
              className="max-w-5xl font-black tracking-tight text-white"
              style={{ fontSize: "clamp(3rem, 10vw, 8rem)", lineHeight: 1.05 }}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              FINALLY.{" "}
              <span
                className="bg-gradient-to-r from-violet-400 via-pink-400 to-violet-400 bg-clip-text text-transparent"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AN AI
              </span>
              <br />
              THAT{" "}
              <span
                className="bg-gradient-to-r from-pink-400 via-violet-400 to-pink-400 bg-clip-text text-transparent"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SPEAKS CAR.
              </span>
            </motion.h1>

            <motion.p
              className="max-w-2xl text-xl font-medium text-violet-300 sm:text-2xl md:text-3xl"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              Your AI co-pilot for every drive
            </motion.p>

            <motion.p
              className="max-w-3xl text-base text-white/50 sm:text-lg md:text-xl leading-relaxed"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              Volini knows every car made since 1900. Every spec. Every story. Ask
              anything — from{" "}
              <span className="text-white/70">
                &ldquo;What was the MSRP of a 1969 Boss 302?&rdquo;
              </span>{" "}
              to{" "}
              <span className="text-white/70">
                &ldquo;Why does the Porsche 911 silhouette matter?&rdquo;
              </span>{" "}
              — and get answers like you&apos;re chatting with a fellow gearhead.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center gap-4 mt-4"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              <Button
                onClick={scrollToDemo}
                size="lg"
                className="group relative overflow-hidden bg-violet-600 hover:bg-violet-500 text-white font-bold px-12 py-8 text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(139,92,246,0.6)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  SEE VOLINI IN ACTION
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </span>
              </Button>
            </motion.div>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-3 mt-6"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.6 } },
              }}
            >
              {[
                { name: "LiveKit", version: "RTC" },
                { name: "OpenAI", version: "GPT-4.1" },
                { name: "Faster Whisper", version: "STT" },
                { name: "Kokoro TTS", version: "ONNX" },
              ].map((tech, i) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                >
                  <Badge
                    variant="outline"
                    className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm px-3 py-1.5 backdrop-blur-sm hover:bg-violet-500/20 transition-colors"
                  >
                    <span className="font-bold">{tech.name}</span>
                    <span className="ml-1.5 font-mono text-xs opacity-60">
                      {tech.version}
                    </span>
                  </Badge>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <button
          onClick={scrollToDemo}
          className="flex flex-col items-center gap-2 text-white/30 hover:text-white/50 transition-colors"
          aria-label="Scroll to demo"
        >
          <span className="text-xs uppercase tracking-widest font-mono">Explore</span>
          <div className="animate-bounce">
            <ChevronDown className="h-6 w-6" />
          </div>
        </button>
      </motion.div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px z-30"
        style={{
          background: "linear-gradient(to right, transparent, rgba(139, 92, 246, 0.5), transparent)",
        }}
      />
    </section>
  )
}

"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DemoAudioVisualizer from "@/components/landing/DemoAudioVisualizer"
import { useRouter } from "next/navigation"

interface Message {
  id: string
  role: "user" | "volini"
  text: string
}

interface DemoConversationProps {
  messages: Message[]
  activeMessage: number
  currentCharIndex: number
}

const F40_INTRO: Message[] = [
  {
    id: "1",
    role: "user",
    text: "Tell me about the Ferrari F40",
  },
  {
    id: "2",
    role: "volini",
    text: "The F40 is where Ferrari said 'we're done with rules.' 1987. 478 horsepower from a twin-turbo V8. No ABS. No airbags. The last car Enzo Ferrari personally approved.\n\nIt wasn't built for comfort or safety — it was built for drivers who believed the road was a cathedral.\n\nToday, pristine examples sell for $2-3M. But the real F40 experience? Finding a mountain pass at 6am and remembering why we fell in love with cars in the first place.",
  },
]

const F40_COMPARE: Message[] = [
  {
    id: "3",
    role: "user",
    text: "How does it compare to the new SF90?",
  },
  {
    id: "4",
    role: "volini",
    text: "Totally different philosophies. The SF90 is 986hp of hybrid fury — it's the future Ferrari HAS to build.\n\nBut 'faster' and 'better' aren't synonyms. The F40 weighs 1,200 pounds less. No power steering. No driving modes. Just you, the wheel, and 478 horses screaming behind your head.\n\nThe SF90 will outrun it in a straight line. But on a winding road? The F40 still smiles harder.",
  },
]

export default function DemoSection() {
  const router = useRouter()
  const [conversation, setConversation] = React.useState<Message[]>([])
  const [activeTab, setActiveTab] = React.useState<"intro" | "compare">("intro")
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0)
  const [currentCharIndex, setCurrentCharIndex] = React.useState(0)
  const [isTyping, setIsTyping] = React.useState(false)
  const [visualizerState, setVisualizerState] = React.useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation, currentCharIndex])

  const getCurrentMessages = () =>
    activeTab === "intro" ? F40_INTRO : F40_COMPARE

  const startConversation = React.useCallback(
    (tab: "intro" | "compare") => {
      setActiveTab(tab)
      setConversation([])
      setCurrentMessageIndex(0)
      setCurrentCharIndex(0)
      setIsTyping(true)
      setVisualizerState("thinking")

      const messages = tab === "intro" ? F40_INTRO : F40_COMPARE

      const playSequence = async () => {
        for (let i = 0; i < messages.length; i++) {
          setCurrentMessageIndex(i)
          setVisualizerState(
            messages[i].role === "user" ? "listening" : "thinking"
          )

          if (messages[i].role === "volini") {
            const text = messages[i].text
            for (let j = 0; j <= text.length; j++) {
              setCurrentCharIndex(j)
              await new Promise((r) =>
                setTimeout(r, 8 + Math.random() * 12)
              )
            }
            setVisualizerState("speaking")
            await new Promise((r) => setTimeout(r, 300))
          } else {
            setVisualizerState("listening")
            await new Promise((r) => setTimeout(r, 800))
          }

          setConversation((prev) => [...prev, messages[i]])
        }
        setIsTyping(false)
        setVisualizerState("idle")
      }

      playSequence()
    },
    []
  )

  const handleWakeVolini = () => {
    router.push("/")
  }

  return (
    <section
      id="demo"
      className="relative min-h-screen bg-[#09090b] py-24 overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-[#09090b] to-[#09090b]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8B5CF620_1px,transparent_1px),linear-gradient(to_bottom,#8B5CF620_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <Badge
            variant="outline"
            className="border-violet-500/50 bg-violet-500/10 text-violet-300 text-sm px-4 py-1"
          >
            Live Demo
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            See Volini in Action
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Watch Volini talk about cars the way only a true gearhead can.
            Ask anything — from classic muscle to modern hypercars.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 max-w-6xl mx-auto">
          <div className="flex flex-col items-center space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/20 blur-[100px] rounded-full" />
              <div className="relative z-10">
                <DemoAudioVisualizer
                  size="xl"
                  state={visualizerState}
                  className="scale-125"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-mono uppercase tracking-widest text-white/40">
                {visualizerState === "idle" && "Ready to chat"}
                {visualizerState === "listening" && "Listening..."}
                {visualizerState === "thinking" && "Thinking..."}
                {visualizerState === "speaking" && "Speaking..."}
              </p>
              <Button
                onClick={() => startConversation(activeTab)}
                disabled={isTyping}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-6 text-lg transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTyping ? "Playing..." : "Play Demo"}
              </Button>
            </div>
          </div>

          <div className="relative flex flex-col">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => !isTyping && startConversation("intro")}
                disabled={isTyping}
                className={`px-4 py-2 rounded-md font-mono text-sm transition-all ${
                  activeTab === "intro"
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                } disabled:opacity-50`}
              >
                F40 Introduction
              </button>
              <button
                onClick={() => !isTyping && startConversation("compare")}
                disabled={isTyping}
                className={`px-4 py-2 rounded-md font-mono text-sm transition-all ${
                  activeTab === "compare"
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                } disabled:opacity-50`}
              >
                F40 vs SF90
              </button>
            </div>

            <div
              ref={scrollRef}
              className="relative flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm"
              style={{ maxHeight: "400px" }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,black_100%)] pointer-events-none z-10 rounded-xl opacity-30" />

              <div className="p-6 space-y-6">
                {conversation.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      msg.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white"
                          : "bg-white/5 border border-white/10 text-white/90"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono uppercase tracking-wider opacity-60">
                          {msg.role === "user" ? "You" : "Volini"}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {isTyping &&
                  currentMessageIndex < getCurrentMessages().length && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono uppercase tracking-wider text-violet-400">
                            Volini
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-white/90">
                          {getCurrentMessages()[currentMessageIndex].role ===
                            "volini" &&
                            getCurrentMessages()[currentMessageIndex].text.slice(
                              0,
                              currentCharIndex
                            )}
                          <span className="inline-block w-2 h-4 ml-1 bg-violet-400 animate-pulse" />
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleWakeVolini}
                size="lg"
                className="bg-pink-600 hover:bg-pink-500 text-white font-semibold px-10 py-6 text-lg transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
              >
                Wake up Volini
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent"
        aria-hidden
      />
    </section>
  )
}

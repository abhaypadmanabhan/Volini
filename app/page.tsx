"use client"

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"
import { useState } from "react"
import HeroSection from "@/components/landing/HeroSection"
import DemoSection from "@/components/landing/DemoSection"
import StatsSection from "@/components/landing/StatsSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import B2BSection from "@/components/landing/B2BSection"
import CTASection from "@/components/landing/CTASection"
import AssistantInterface from "@/components/AssistantInterface"

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      <HeroSection />
      <DemoSection />
      <StatsSection />
      <FeaturesSection />
      <B2BSection />
      <CTASection />
      <footer className="px-6 py-8 text-center border-t border-white/5">
        <p className="text-xs font-mono text-white/30">
          © 2026 Volini · Built with LiveKit, OpenAI, Faster Whisper, Kokoro TTS
        </p>
      </footer>
    </div>
  )
}

export default function Home() {
  const [token, setToken] = useState("")
  const [serverUrl, setServerUrl] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    try {
      setConnecting(true)
      setError(null)
      const res = await fetch("/api/token")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch token")
      setToken(data.token)
      setServerUrl(data.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed")
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    setToken("")
    setServerUrl("")
  }

  if (token && serverUrl) {
    return (
      <div className="fixed inset-0 bg-[#09090b] z-50">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={disconnect}
        >
          <AssistantInterface onDisconnect={disconnect} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    )
  }

  return <LandingPage />
}

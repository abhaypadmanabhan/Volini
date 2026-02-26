"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useEffect, useState } from "react";
import AssistantInterface from "../components/AssistantInterface";

export default function Home() {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectToLiveKit = async () => {
    try {
      setConnecting(true);
      setError(null);
      const res = await fetch("/api/token");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch token");
      }

      setToken(data.token);
      setServerUrl(data.url);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setToken("");
    setServerUrl("");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Decorative background gradient */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#09090b] to-[#09090b] -z-10" />

      <div className="z-10 w-full max-w-xl items-center justify-center font-sans">
        <div className="flex flex-col gap-8 w-full glass-panel rounded-3xl p-8 shadow-2xl transition-all duration-300">

          <div className="text-center space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight">Volini</h1>
            <p className="text-zinc-400 text-sm font-medium">Voice Assistant</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          {token && serverUrl ? (
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
          ) : (
            <div className="flex flex-col gap-6 items-center w-full mt-4">
              <button
                onClick={connectToLiveKit}
                disabled={connecting}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3"
              >
                {connecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Wake up Volini"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import VoiceModal from "@/components/VoiceModal";
import { Mic } from "lucide-react";

// Main Landing Page
export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 text-center max-w-2xl px-4 animate-fade-in-up">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
          Your Voice-Based <br />
          <span className="text-blue-400">Dubai Trip Planner</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 mb-10 max-w-lg mx-auto">
          Plan a 2–4 day Dubai itinerary using just your voice.
          Experience the future of travel planning.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]"
        >
          <span className="p-2 bg-blue-500 rounded-full group-hover:bg-blue-400 transition-colors">
            <Mic className="w-5 h-5 text-white" />
          </span>
          <span className="text-lg font-medium text-white">Plan my trip</span>
        </button>
      </div>

      {isModalOpen && <VoiceModal onClose={() => setIsModalOpen(false)} />}
    </main>
  );
}

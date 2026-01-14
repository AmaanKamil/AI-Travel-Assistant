"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, X, Loader2, MessageSquare, Mail, RefreshCw, Check, User } from "lucide-react";
import TranscriptBox from "./TranscriptBox";
import { orchestrateTrip, exportItinerary, editItinerary } from "@/lib/api";
import { toggleRecording } from "@/lib/voice";
import ItineraryView from "./ItineraryView";
import SourcesPanel from "./SourcesPanel";
import PlanningChecks from "./PlanningChecks";

interface VoiceModalProps {
    onClose: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function VoiceModal({ onClose }: VoiceModalProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // CHAT HISTORY STATE (Fix D)
    const [messages, setMessages] = useState<Message[]>([]);

    const [pendingTranscript, setPendingTranscript] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    const [displayItinerary, setDisplayItinerary] = useState<any>(null);
    const [evaluations, setEvaluations] = useState<any>(null);
    const [citations, setCitations] = useState<any[]>([]);
    const [highlightDay, setHighlightDay] = useState<number | null>(null);

    const [email, setEmail] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<string | null>(null);

    // TTS Playback Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, pendingTranscript]);

    const handleExport = async () => {
        if (!email || !displayItinerary) return;

        setIsExporting(true);
        setExportStatus(null);

        // DIRECT CALL (Fix E)
        const result = await exportItinerary(displayItinerary, email);

        if (result.success) {
            setExportStatus("Email sent successfully!");
            setEmail("");
            setTimeout(() => setExportStatus(null), 3000);
        } else {
            setExportStatus("Failed: " + result.message);
        }
        setIsExporting(false);
    };

    const handleSubmit = async (text: string, isSystemBoot = false) => {
        if (!text) return;

        // Update History (if not hidden system boot)
        if (!isSystemBoot) {
            setMessages(prev => [...prev, { role: 'user', content: text }]);
        }

        setIsProcessing(true);
        let result: any;

        // UNCONDITIONAL ROUTING
        console.log("Routing to /orchestrate");
        result = await orchestrateTrip("ui-demo", text);

        if (result.error) {
            setMessages(prev => [...prev, { role: 'assistant', content: result.message || "Something went wrong." }]);
        } else {
            // Append assistant response
            if (result.message) {
                setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
            }

            if (result.itinerary) {
                setDisplayItinerary(result.itinerary);
            }
            if (result.evaluation) {
                setEvaluations(result.evaluation);
            }
            if (result.citations) {
                setCitations(result.citations);
            }

            // Handle Edit Highlighting
            const dayMatch = text.match(/day\s*(\d+)/i);
            if (dayMatch) {
                const dayNum = parseInt(dayMatch[1]);
                setHighlightDay(dayNum);
                setTimeout(() => setHighlightDay(null), 2000);
            }

            // Play Voice
            if (result.audio) {
                playAudio(result.audio);
            }
        }
        setIsProcessing(false);
    };

    const handleTranscript = (text: string) => {
        setPendingTranscript(text);
        setShowConfirm(true);
    };

    const handleMicClick = () => {
        setPendingTranscript("");
        setShowConfirm(false);
        // If speaking, stop logic (toggleRecording handles this via shared state logic usually, 
        // but here we just call the helper which toggles based on isListening or creates new recognition)
        toggleRecording(setIsListening, handleTranscript);
    };

    const confirmTranscript = () => {
        if (pendingTranscript) {
            handleSubmit(pendingTranscript);
            setPendingTranscript("");
            setShowConfirm(false);
        }
    };

    const retryListening = () => {
        setPendingTranscript("");
        setShowConfirm(false);
        toggleRecording(setIsListening, handleTranscript);
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // SYSTEM BOOT (First Load)
    useEffect(() => {
        const initSystem = async () => {
            console.log("Triggering SYSTEM_BOOT...");
            await handleSubmit("SYSTEM_BOOT", true);
        };
        initSystem();
    }, []);

    const playAudio = (base64Audio: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        if (!base64Audio) return;

        try {
            const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
            audioRef.current = audio;
            audio.play().catch(e => console.error("Audio play error", e));
        } catch (e) {
            console.error("Invalid audio data", e);
        }
    };

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const isValidEmail = validateEmail(email);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white animate-in fade-in duration-300">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <h1 className="text-lg font-bold tracking-tight">Dubai AI Planner</h1>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
            </div>

            {/* SPLIT LAYOUT */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* LEFT PANEL: CHAT */}
                <div className={`
                    flex-1 flex flex-col min-w-0 bg-gray-900/50 relative transition-all duration-500
                    ${displayItinerary ? 'hidden md:flex md:w-1/3 md:max-w-md border-r border-white/5' : 'w-full'}
                `}>

                    {/* CHAT MESSAGES AREA */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">

                        {/* Empty State */}
                        {messages.length === 0 && !pendingTranscript && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                                <Mic className="w-12 h-12 mb-4 text-blue-400 opacity-50" />
                                <p className="text-lg font-medium">"Plan a 3 day trip to Dubai..."</p>
                            </div>
                        )}

                        {/* Message History */}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                        {msg.role === 'assistant' ? <MessageSquare className="w-3 h-3 text-white" /> : <User className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">{msg.role}</span>
                                </div>
                                <TranscriptBox transcript={msg.content} isUser={msg.role === 'user'} />
                            </div>
                        ))}

                        {/* Recent Evaluations (Attached to bottom of stream if exists) */}
                        {(evaluations || citations.length > 0) && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                {evaluations && <PlanningChecks evaluations={evaluations} />}
                                <SourcesPanel sources={citations} />
                            </div>
                        )}

                        {/* Pending Transcript (User) */}
                        {pendingTranscript && (
                            <div className="space-y-4 pt-4">
                                <TranscriptBox
                                    transcript={pendingTranscript}
                                    isUser={true}
                                    status={isListening ? "Listening..." : (isProcessing ? "Processing..." : "")}
                                />
                                {/* Confirm / Retry UI */}
                                {showConfirm && (
                                    <div className="flex gap-2 justify-end animate-in fade-in slide-in-from-top-2">
                                        <button onClick={retryListening} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs border border-white/10 transition-all">Retry</button>
                                        <button onClick={confirmTranscript} className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs border border-green-500/20 transition-all flex items-center gap-2"><Check className="w-3 h-3" /> Confirm</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* CONTROLS (Sticky Bottom) */}
                    <div className="p-4 bg-gradient-to-t from-gray-950 to-transparent flex flex-col items-center gap-4">
                        <button
                            onClick={handleMicClick}
                            disabled={isProcessing}
                            className={`
                                relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-xl
                                ${isListening ? 'bg-red-500 scale-110 shadow-red-500/40 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'}
                                ${isProcessing ? 'opacity-50 cursor-not-allowed bg-gray-700' : ''}
                            `}
                        >
                            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Mic className="w-6 h-6 text-white" />}
                        </button>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{isListening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Tap to Speak'}</p>
                    </div>
                </div>

                {/* RIGHT PANEL: ITINERARY */}
                {displayItinerary && (
                    <div className="flex-1 overflow-y-auto bg-gray-950 relative border-l border-white/5 scrollbar-hide animate-in slide-in-from-right-10 duration-700">
                        <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
                            {/* Header */}
                            <div className="flex flex-col gap-2">
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                    {displayItinerary.title || "Your Dubai Itinerary"}
                                </h2>
                                <p className="text-gray-400 text-sm">Generated by AI • Editable via Voice</p>
                            </div>

                            {/* Itinerary Component */}
                            <ItineraryView itinerary={displayItinerary} highlightDay={highlightDay} />

                            {/* EMAIL ACTION */}
                            <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="flex-1 w-full">
                                        <label className="text-xs text-gray-400 mb-1.5 block ml-1">Send to Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                className={`w-full bg-black/20 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:ring-2 outline-none transition-all
                                                     ${isValidEmail ? 'border-white/10 focus:border-blue-500 focus:ring-blue-500/20' : 'border-red-500/20 focus:border-red-500 focus:ring-red-500/10'}
                                                 `}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        disabled={isExporting || !isValidEmail}
                                        className={`
                                             px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 w-full sm:w-auto justify-center mt-6 sm:mt-0
                                             ${isValidEmail && !isExporting
                                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                                         `}
                                    >
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        {isExporting ? 'Sending...' : 'Send PDF'}
                                    </button>
                                </div>
                                {exportStatus && (
                                    <p className={`text-xs mt-3 text-center ${exportStatus.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                                        {exportStatus}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, X, Loader2, MessageSquare, Mail, RefreshCw, Check } from "lucide-react";
import TranscriptBox from "./TranscriptBox";
import { orchestrateTrip, exportItinerary, editItinerary } from "@/lib/api";
import ItineraryView from "./ItineraryView";
import SourcesPanel from "./SourcesPanel";
import PlanningChecks from "./PlanningChecks";

// Removed Window interface for SpeechRecognition as we use MediaRecorder now

interface VoiceModalProps {
    onClose: () => void;
}

export default function VoiceModal({ onClose }: VoiceModalProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [pendingTranscript, setPendingTranscript] = useState(""); // New state for confirmation
    const [responseMessage, setResponseMessage] = useState("");
    const [displayItinerary, setDisplayItinerary] = useState<any>(null);
    const [evaluations, setEvaluations] = useState<any>(null);
    const [citations, setCitations] = useState<any[]>([]);
    const [highlightDay, setHighlightDay] = useState<number | null>(null);

    const [email, setEmail] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const handleExport = async () => {
        if (!email || !displayItinerary) return;

        setIsExporting(true);
        const result = await exportItinerary(displayItinerary, email);
        if (result.success) {
            setResponseMessage("I've emailed the itinerary to you!");
            setEmail(""); // clear input on success
        } else {
            setResponseMessage("Failed to send email: " + result.message);
        }
        setIsExporting(false);
    };

    const handleSubmit = async (text: string) => {
        if (!text) return;

        setIsProcessing(true);
        let result: any;

        // CLIENT-SIDE ROUTING (Strict Separation)
        const isEditIntent = /make|change|swap|add|remove|replace|relax/i.test(text);

        if (isEditIntent && displayItinerary) {
            console.log("Routing to /edit-itinerary");
            result = await editItinerary("ui-demo", text);
        } else {
            console.log("Routing to /orchestrate");
            result = await orchestrateTrip("ui-demo", text);
        }

        if (result.error) {
            setResponseMessage(result.message || "Something went wrong.");
            // Do not clear previous content on error
        } else {
            setResponseMessage(result.message);
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
            // Note: Backend might return target_day in message or update, 
            // but for now let's just highlight if regex detects a day
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

    const processAudio = async (blob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'speech.webm');

            const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.text) {
                setPendingTranscript(data.text);
            }
        } catch (error) {
            console.error("Transcription failed", error);
            setResponseMessage("Sorry, I couldn't hear that properly.");
        } finally {
            setIsProcessing(false);
        }
    };

    const startListening = async () => {
        setResponseMessage("");
        setPendingTranscript("");
        setTranscript("");
        window.speechSynthesis.cancel();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                processAudio(blob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsListening(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    const confirmTranscript = () => {
        if (pendingTranscript) {
            setTranscript(pendingTranscript);
            handleSubmit(pendingTranscript);
            setPendingTranscript("");
        }
    };

    const retryListening = () => {
        setPendingTranscript("");
        startListening();
    };


    // TTS Playback Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Stop audio when component unmounts or new speech starts
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
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

    // Removed old startListening/stopListening as they are redefined above

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-500">
            <div className="relative w-full max-w-2xl bg-gray-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <h2 className="text-xl font-semibold text-white">AI Travel Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

                    {/* Transcript / Chat Area */}
                    <div className="space-y-6">
                        {/* User Transcript */}
                        {(transcript || pendingTranscript) && (
                            <div className="space-y-4">
                                <TranscriptBox
                                    transcript={pendingTranscript || transcript}
                                    isUser={true}
                                    status={isListening ? "Listening..." : (isProcessing ? "Processing..." : "")}
                                />

                                {pendingTranscript && (
                                    <div className="flex items-center gap-4 justify-end animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={retryListening}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all text-sm font-medium border border-white/10"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Retry
                                        </button>
                                        <button
                                            onClick={confirmTranscript}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all text-sm font-medium border border-green-500/20"
                                        >
                                            <Check className="w-4 h-4" />
                                            Confirm
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Assistant Response */}
                        {responseMessage && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <MessageSquare className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assistant</span>
                                </div>
                                <TranscriptBox
                                    transcript={responseMessage}
                                    isUser={false}
                                />
                            </div>
                        )}
                    </div>

                    {/* Rich Components Area */}
                    {(displayItinerary || evaluations || citations.length > 0) && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">

                            {/* Visual Separator */}
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            {/* Planning Checks & Sources Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {evaluations && <PlanningChecks evaluations={evaluations} />}
                                <SourcesPanel sources={citations} />
                            </div>

                            {/* Detailed Itinerary */}
                            {displayItinerary && (
                                <ItineraryView itinerary={displayItinerary} highlightDay={highlightDay} />
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Controls */}
                <div className="p-8 border-t border-white/5 flex flex-col items-center gap-6 bg-gradient-to-t from-black/20 to-transparent">
                    {/* Export Section */}
                    {displayItinerary && (
                        <div className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                            <input
                                type="email"
                                placeholder="Enter your email to receive this plan"
                                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 border-none focus:ring-0 outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <button
                                onClick={handleExport}
                                disabled={isExporting || !email}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                                {isExporting ? "Sending..." : "Send to Email"}
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={isListening ? stopListening : startListening}
                            disabled={isProcessing}
                            className={`
                            relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg group
                            ${isListening ? 'bg-red-500 scale-110 shadow-red-500/50 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/50'}
                            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        >
                            <div className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-20 group-hover:opacity-40" />
                            {isProcessing ? (
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            ) : (
                                <Mic className={`w-8 h-8 text-white ${isListening ? 'scale-110' : ''}`} />
                            )}
                        </button>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em]">
                            {isListening ? "Listening..." : isProcessing ? "Thinking..." : "Tap to Speak"}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}

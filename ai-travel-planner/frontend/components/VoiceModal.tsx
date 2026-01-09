"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, X, Loader2, MessageSquare } from "lucide-react";
import TranscriptBox from "./TranscriptBox";
import { orchestrateTrip } from "@/lib/api";
import ItineraryView from "./ItineraryView";
import SourcesPanel from "./SourcesPanel";
import PlanningChecks from "./PlanningChecks";

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface VoiceModalProps {
    onClose: () => void;
}

export default function VoiceModal({ onClose }: VoiceModalProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [responseMessage, setResponseMessage] = useState("");
    const [displayItinerary, setDisplayItinerary] = useState<any>(null);
    const [evaluations, setEvaluations] = useState<any>(null);
    const [citations, setCitations] = useState<any[]>([]);
    const [highlightDay, setHighlightDay] = useState<number | null>(null);

    const recognitionRef = useRef<any>(null);

    const handleSubmit = async (text: string) => {
        if (!text) return;

        setIsProcessing(true);
        // Call backend
        const result = await orchestrateTrip("ui-demo", text) as any;

        if (result.error) {
            setResponseMessage("Error: " + result.error);
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
            if (result.editIntent && result.editIntent.target_day) {
                setHighlightDay(result.editIntent.target_day);
                // Clear highlight after 2 seconds
                setTimeout(() => setHighlightDay(null), 2000);
            }
        }
        setIsProcessing(false);
    };

    useEffect(() => {
        // Initialize Speech Recognition
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false; // Stop after one sentence/fragment
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onstart = () => {
                    setIsListening(true);
                    setTranscript("");
                };

                recognition.onresult = (event: any) => {
                    let currentTranscript = "";
                    for (let i = 0; i < event.results.length; i++) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                    setTranscript(currentTranscript);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, []);

    // Effect to trigger logic when listening stops naturally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!isListening && transcript.trim().length > 0 && !responseMessage) {
            handleSubmit(transcript);
        }
    }, [isListening]);


    const startListening = () => {
        setResponseMessage("");
        // setDisplayItinerary(null); // Keep previous itinerary visible for editing context
        setEvaluations(null);
        setCitations([]);
        setTranscript("");
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Start error:", e);
            }
        } else {
            alert("Speech recognition not supported in this browser.");
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

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
                        {(transcript || isListening) && (
                            <TranscriptBox
                                transcript={transcript}
                                isUser={true}
                                status={isListening ? "Listening..." : (isProcessing ? "Processing..." : "")}
                            />
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
                <div className="p-8 border-t border-white/5 flex flex-col items-center gap-4 bg-gradient-to-t from-black/20 to-transparent">
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
    );
}


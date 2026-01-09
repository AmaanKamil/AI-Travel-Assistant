"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, X, Loader2 } from "lucide-react";
import TranscriptBox from "./TranscriptBox";
import { orchestrateTrip } from "@/lib/api";

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

    const recognitionRef = useRef<any>(null);

    const handleSubmit = async (text: string) => {
        if (!text) return;

        setIsProcessing(true);
        // Call backend
        const result = await orchestrateTrip("ui-demo", text);

        if (result.error) {
            setResponseMessage("Error: " + result.error);
        } else {
            setResponseMessage(result.message);
            if (result.itinerary) {
                setDisplayItinerary(result.itinerary);
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
        setDisplayItinerary(null);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="relative w-full max-w-lg bg-gray-900/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-semibold text-white">Travel Assistant</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

                    {/* Transcript / Chat Area */}
                    <div className="flex flex-col gap-4">
                        {/* User Transcript */}
                        <TranscriptBox
                            transcript={transcript}
                            isUser={true}
                            status={isListening ? "Listening..." : (isProcessing ? "Processing..." : "")}
                        />

                        {/* Assistant Response */}
                        {responseMessage && (
                            <div className="animate-fade-in-up">
                                <TranscriptBox
                                    transcript={responseMessage}
                                    isUser={false}
                                    status="Assistant"
                                />
                            </div>
                        )}

                        {/* Itinerary Preview (JSON/Simple) */}
                        {displayItinerary && (
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-sm text-gray-300 overflow-x-auto">
                                <pre>{JSON.stringify(displayItinerary, null, 2)}</pre>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer / Controls */}
                <div className="p-6 border-t border-white/5 flex justify-center pb-8">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={isProcessing}
                        className={`
                relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg
                ${isListening ? 'bg-red-500 scale-110 shadow-red-500/50 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/50'}
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
             `}
                    >
                        {isProcessing ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : (
                            <Mic className={`w-8 h-8 text-white ${isListening ? 'animate-bounce' : ''}`} />
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}

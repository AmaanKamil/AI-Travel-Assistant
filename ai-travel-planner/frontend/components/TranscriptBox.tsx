import { cn } from "@/lib/utils"; // We might need to create utils if we use clsx/tailwind-merge
import { useEffect, useRef } from "react";

interface TranscriptBoxProps {
    transcript: string;
    isUser?: boolean;
    status?: string;
}

export default function TranscriptBox({ transcript, isUser = true, status }: TranscriptBoxProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    return (
        <div className="w-full max-h-[300px] overflow-y-auto custom-scrollbar p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex flex-col gap-2">
                {status && (
                    <span className="text-xs uppercase tracking-widest text-blue-400 font-semibold animate-pulse mb-2">
                        {status}
                    </span>
                )}
                <p className={cn(
                    "text-lg leading-relaxed",
                    isUser ? "text-white/90" : "text-blue-100"
                )}>
                    {transcript || (status === "Listening..." ? "Start speaking..." : "")}
                </p>
            </div>
            <div ref={scrollRef} />
        </div>
    );
}

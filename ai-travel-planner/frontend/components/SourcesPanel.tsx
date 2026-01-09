"use client";

import React from 'react';
import { ExternalLink, Link2, Info } from 'lucide-react';

interface Source {
    source: string;
    section?: string;
    url: string;
}

interface SourcesPanelProps {
    sources?: Source[];
}

const SourcesPanel: React.FC<SourcesPanelProps> = ({ sources }) => {
    const hasSources = sources && sources.length > 0;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">Sources and References</h3>
                </div>
                {hasSources && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                        {sources.length} {sources.length === 1 ? 'Source' : 'Sources'}
                    </span>
                )}
            </div>

            <div className="p-6">
                {!hasSources ? (
                    <div className="flex items-center gap-3 text-gray-500">
                        <Info className="w-5 h-5 opacity-50" />
                        <p className="text-sm italic">No external sources were required for this response.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {sources.map((source, idx) => (
                            <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all"
                            >
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                        {source.source}
                                    </span>
                                    {source.section && (
                                        <span className="text-xs text-gray-500">
                                            {source.section}
                                        </span>
                                    )}
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourcesPanel;

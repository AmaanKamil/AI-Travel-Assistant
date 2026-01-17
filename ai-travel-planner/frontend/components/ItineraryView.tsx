"use client";

import React, { useState } from 'react';
import { Calendar, MapPin, Info, ChevronDown, ChevronUp } from 'lucide-react';
import PlanningChecks from './PlanningChecks';

interface Activity {
    name: string;
    category: string;
    description?: string;
    cuisine?: string;
}

interface Itinerary {
    title: string;
    days: any[];
}

interface ItineraryViewProps {
    itinerary: Itinerary;
    highlightDay?: number | null;
    evals?: any;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ itinerary, highlightDay, evals }) => {
    if (!itinerary || !itinerary.days) return null;

    // Map Backend Evals to Frontend Props
    const planningChecksData = evals ? {
        feasibility: { passed: evals.feasibility?.status === 'pass', message: evals.feasibility?.reason },
        edit_correctness: { passed: evals.editCorrectness?.status === 'pass', message: evals.editCorrectness?.reason },
        grounding: { passed: evals.grounding?.status === 'pass', message: evals.grounding?.reason }
    } : undefined;

    function mapBlockToActivity(block: any): Activity {
        const isMeal = block.type === 'MEAL' || block.mealType;
        const fallbackCat = isMeal ? 'Meal' : 'Sightseeing';

        return {
            name: block.activity,
            category: block.category || fallbackCat,
            description: block.description || block.cuisine,
            cuisine: block.cuisine
        };
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-white tracking-tight">Your Custom Itinerary</h2>
            </div>

            {/* SYSTEM EVALUATIONS (Visible at top) */}
            {planningChecksData && (
                <PlanningChecks evaluations={planningChecksData} />
            )}

            <div className="grid gap-8">
                {itinerary.days.map((dayData, idx) => {
                    const dayNumber = dayData.day || (idx + 1);
                    const isHighlighted = highlightDay === dayNumber;

                    // Group by Time of Day
                    const timeGroups: Record<string, any[]> = { 'Morning': [], 'Afternoon': [], 'Evening': [] };
                    (dayData.blocks || []).forEach((b: any) => {
                        const rawSlot = b.timeBlock || b.timeOfDay || 'Morning';

                        // Defensive case normalization (legacy might be 'morning')
                        const slot = rawSlot.charAt(0).toUpperCase() + rawSlot.slice(1).toLowerCase();

                        if (timeGroups[slot]) timeGroups[slot].push(b);
                        else timeGroups['Morning'].push(b);
                    });

                    return (
                        <div
                            key={idx}
                            className={`group relative bg-white/5 border rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 ${isHighlighted
                                ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.02]'
                                : 'border-white/10 hover:border-white/20 hover:bg-white/10'
                                }`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 text-sm">
                                            {dayNumber}
                                        </span>
                                        Day {dayNumber}
                                    </h3>
                                </div>

                                <div className="space-y-8">
                                    {['Morning', 'Afternoon', 'Evening'].map((slot) => {
                                        const items = timeGroups[slot];
                                        if (!items || items.length === 0) return null;

                                        return (
                                            <div key={slot} className="relative">
                                                {/* TIME SLOT HEADER */}
                                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                                                    {slot}
                                                </h4>

                                                <div className="space-y-6">
                                                    {items.map((block: any, bIdx: number) => {
                                                        const activity = mapBlockToActivity(block);

                                                        return (
                                                            <div key={bIdx} className="relative">
                                                                <ItemCard block={block} activity={activity} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Sub-component to manage collapsible state efficiently
const ItemCard = ({ block, activity }: { block: any, activity: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const explanation = block.explanation;

    return (
        <div className="relative">
            {/* TRAVEL TIME (rendered before item if exists) */}
            {block.travelTime && (
                <div className="flex items-center gap-2 text-xs text-gray-500 italic mb-3 ml-2">
                    <div className="h-4 w-0.5 bg-gray-800"></div>
                    <span>↓ {block.travelTime}</span>
                </div>
            )}

            {/* ITEM CARD */}
            <div className="relative pl-6 border-l-2 border-white/5 hover:border-blue-500/50 transition-colors">
                <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-gray-800 border-2 border-white/10 group-hover:border-blue-500/30 transition-colors" />

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <h5 className="font-medium text-white text-lg">{activity.name}</h5>
                            <div className="flex items-center gap-2">
                                {block.duration && (
                                    <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md whitespace-nowrap">
                                        {block.duration}
                                    </span>
                                )}
                                {explanation && (
                                    <button
                                        onClick={() => setIsOpen(!isOpen)}
                                        className="text-gray-400 hover:text-blue-400 transition-colors p-1"
                                    >
                                        <Info size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {activity.cuisine ? (
                            <div className="text-sm text-blue-400 italic">Cuisine: {activity.cuisine}</div>
                        ) : activity.description ? (
                            <div className="text-sm text-gray-400">{activity.description}</div>
                        ) : null}

                        <div className="flex items-center justify-between mt-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                                {activity.category}
                            </span>
                        </div>

                        {/* EXPLANATION DROPDOWN */}
                        {isOpen && explanation && (
                            <div className="mt-4 pt-3 border-t border-white/10 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-gray-300 mb-2">
                                    <span className="text-blue-400 font-semibold">Why: </span>
                                    {explanation.whyChosen}
                                </p>
                                <p className="text-gray-300 mb-2">
                                    <span className="text-green-400 font-semibold">Feasibility: </span>
                                    {explanation.feasibilityReason}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {explanation.sources?.map((src: string, i: number) => (
                                        <span key={i} className="text-[10px] text-gray-500 border border-white/10 px-1.5 py-0.5 rounded">
                                            {src}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItineraryView;

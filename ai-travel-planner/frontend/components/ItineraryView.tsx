"use client";

import React from 'react';
import { Calendar, MapPin } from 'lucide-react';

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
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ itinerary, highlightDay }) => {
    if (!itinerary || !itinerary.days) return null;

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

            <div className="grid gap-8">
                {itinerary.days.map((dayData, idx) => {
                    const dayNumber = dayData.day || (idx + 1);
                    const isHighlighted = highlightDay === dayNumber;
                    const activities = (dayData.blocks || []).map(mapBlockToActivity);

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

                                <div className="space-y-4">
                                    {activities.map((activity: Activity, aIdx: number) => (
                                        <div
                                            key={aIdx}
                                            className="relative pl-6 border-l-2 border-white/5 last:border-0 hover:border-blue-500/50 transition-colors"
                                        >
                                            <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-gray-800 border-2 border-white/10 group-hover:border-blue-500/30 transition-colors" />

                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div>
                                                        <h5 className="font-medium text-white">{activity.name}</h5>

                                                        {activity.cuisine ? (
                                                            <div className="text-sm text-blue-400 italic mb-1">Cuisine: {activity.cuisine}</div>
                                                        ) : activity.description ? (
                                                            <div className="text-sm text-gray-400 mb-1">{activity.description}</div>
                                                        ) : null}

                                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                {activity.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ItineraryView;

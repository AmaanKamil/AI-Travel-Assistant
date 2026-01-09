"use client";

import React from 'react';
import { Calendar, Clock, MapPin, Coffee, Sun, Moon } from 'lucide-react';

interface Activity {
    name: string;
    category: string;
    duration: string;
    travelTime?: string;
    time?: string; // Optional: backfill if grouping isn't pre-defined
}

interface Section {
    title: string;
    activities: Activity[];
}

interface DayPlan {
    day: number;
    morning: Activity[];
    afternoon: Activity[];
    evening: Activity[];
}

interface Itinerary {
    title: string;
    days: any[]; // Using any because the incoming structure might vary
}

interface ItineraryViewProps {
    itinerary: Itinerary;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ itinerary }) => {
    if (!itinerary || !itinerary.days) return null;

    // Helper to group activities if they are just a flat list of blocks
    const getSections = (dayData: any) => {
        // If the data already has morning/afternoon/evening
        if (dayData.morning || dayData.afternoon || dayData.evening) {
            return [
                { title: 'Morning', activities: dayData.morning || [], icon: <Coffee className="w-5 h-5 text-amber-500" /> },
                { title: 'Afternoon', activities: dayData.afternoon || [], icon: <Sun className="w-5 h-5 text-orange-500" /> },
                { title: 'Evening', activities: dayData.evening || [], icon: <Moon className="w-5 h-5 text-indigo-400" /> },
            ];
        }

        // Fallback logic for flat blocks (as seen in backend types)
        const blocks = dayData.blocks || [];
        const morning = blocks.filter((b: any) => {
            const hour = parseInt(b.time);
            return isNaN(hour) || (hour >= 6 && hour < 12) || b.time.toLowerCase().includes('am');
        }).map(mapBlockToActivity);

        const afternoon = blocks.filter((b: any) => {
            const hour = parseInt(b.time);
            return (hour >= 12 && hour < 18) || (b.time.toLowerCase().includes('pm') && parseInt(b.time) < 6) || (b.time.toLowerCase().includes('12'));
        }).map(mapBlockToActivity);

        const evening = blocks.filter((b: any) => {
            const hour = parseInt(b.time);
            return (hour >= 18 || hour < 6) || (b.time.toLowerCase().includes('pm') && parseInt(b.time) >= 6);
        }).map(mapBlockToActivity);

        return [
            { title: 'Morning', activities: morning, icon: <Coffee className="w-5 h-5 text-amber-500" /> },
            { title: 'Afternoon', activities: afternoon, icon: <Sun className="w-5 h-5 text-orange-500" /> },
            { title: 'Evening', activities: evening, icon: <Moon className="w-5 h-5 text-indigo-400" /> },
        ];
    };

    function mapBlockToActivity(block: any): Activity {
        return {
            name: block.activity,
            category: block.category || 'Sightseeing',
            duration: block.duration || '2 hours',
            travelTime: block.travelTime || '20 mins',
            time: block.time
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
                    const sections = getSections(dayData);
                    const dayNumber = dayData.day || (idx + 1);

                    return (
                        <div
                            key={idx}
                            className="group relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10"
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

                                <div className="grid gap-10">
                                    {sections.map((section, sIdx) => (
                                        <div key={sIdx} className="space-y-4">
                                            {section.activities.length > 0 && (
                                                <>
                                                    <div className="flex items-center gap-2 px-1">
                                                        {section.icon}
                                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                                                            {section.title}
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {section.activities.map((activity: Activity, aIdx: number) => (
                                                            <div
                                                                key={aIdx}
                                                                className="relative pl-6 border-l-2 border-white/5 last:border-0 hover:border-blue-500/50 transition-colors"
                                                            >
                                                                <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-gray-800 border-2 border-white/10 group-hover:border-blue-500/30 transition-colors" />

                                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                        <div>
                                                                            <h5 className="font-medium text-white">{activity.name}</h5>
                                                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                                    {activity.category}
                                                                                </span>
                                                                                {activity.time && (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Clock className="w-3 h-3" />
                                                                                        {activity.time}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-start sm:items-end gap-1">
                                                                            <div className="flex items-center gap-1 text-xs text-blue-400">
                                                                                <Clock className="w-3 h-3" />
                                                                                <span>Est. {activity.duration}</span>
                                                                            </div>
                                                                            {activity.travelTime && (
                                                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                                    <MapPin className="w-3 h-3" />
                                                                                    <span>+{activity.travelTime} travel</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
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

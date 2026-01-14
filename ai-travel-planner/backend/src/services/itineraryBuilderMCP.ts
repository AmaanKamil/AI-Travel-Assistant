import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

// Helper to identify "Iconic" POIs (Seeds or High Score)
const isIconic = (poi: any) => poi.score >= 50 || poi.metadata?.source === 'Seed';

// --- VALIDATION HELPER ---
const sanitizeText = (text: string): string | null => {
    if (!text) return null;
    if (/[\u0600-\u06FF]/.test(text)) return null;
    if (text.toLowerCase().includes('unknown')) return null;
    return text;
};

// --- VALIDATION HELPER ---
const isValidPOI = (poi: any): boolean => {
    if (!poi || !poi.name) return false;
    if (!sanitizeText(poi.name)) return false;

    // 1. Required Fields
    if (!poi.category || !poi.location || !poi.location.lat || !poi.location.lng) return false;
    return true;
};

// --- TIMING HELPERS ---
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const estimateTravelTime = (prevLoc: any, currLoc: any): string => {
    if (!prevLoc || !currLoc) return "Travel time varies";

    const dist = haversineDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
    // Assume average city speed 30km/h
    const timeInHours = dist / 30;
    const timeInMins = Math.round(timeInHours * 60);

    if (timeInMins < 5) return "5 mins walk";
    if (timeInMins < 15) return `${timeInMins} mins taxi`;
    return `${timeInMins} mins travel`;
};

const getDuration = (category: string, pace: string): string => {
    const cat = category.toLowerCase();

    // UPDATED LOGIC per User Request
    if (cat.includes('landmark') || cat.includes('sight')) return '90 mins';
    if (cat.includes('mall') || cat.includes('souk')) return '120 mins';
    if (cat.includes('museum')) return '90 mins';
    if (cat.includes('cafe')) return '45 mins';

    if (cat.includes('theme park')) return '4 hours';
    if (cat.includes('beach')) return '3 hours';

    return '90 mins'; // Default
};


export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with ${pois.length} RAW POIs. Pace: ${pace}`);

    // FILTER: Apply Strict Validation First
    const validPOIs = pois.filter(p => sanitizeText(p.name) && isValidPOI(p));

    const plans: DayPlan[] = [];
    const usedPOI_IDs = new Set<string>();

    // Define Zone Priority per Day
    const ZONES = ['Downtown', 'Old Dubai', 'Marina', 'Jumeirah', 'Other'];
    const getZoneForDay = (dayNum: number) => ZONES[(dayNum - 1) % ZONES.length];

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];
        const targetZone = getZoneForDay(i);

        // Define Slots structure (Meal slots fixed)
        // Morning -> Lunch -> Afternoon -> Dinner -> Evening (optional)
        const timeConfigs = [
            { time: 'Morning', type: 'activity', max: 1 },
            { time: '12:30 PM', type: 'lunch', duration: '1h 30m', fixed: true },
            { time: 'Afternoon', type: 'activity', max: pace === 'packed' ? 2 : 1 },
            { time: '07:00 PM', type: 'dinner', duration: '2h', fixed: true },
        ];

        if (pace === 'packed') {
            timeConfigs.push({ time: 'Late Evening', type: 'activity', max: 1 });
        }

        let lastLocation = null;
        let zonePOIs = validPOIs.filter(p => !usedPOI_IDs.has(p.id) && (p.location.zone === targetZone || (!p.location.zone && targetZone === 'Other')));
        let fallbackPOIs = validPOIs.filter(p => !usedPOI_IDs.has(p.id) && p.location.zone !== targetZone);

        for (const config of timeConfigs) {

            // LUNCH SLOT
            if (config.type === 'lunch') {
                dailyBlocks.push({
                    time: config.time,
                    activity: `Lunch in ${targetZone}`,
                    duration: config.duration!,
                    description: `Enjoy local cuisine near your morning activities.`
                });
                continue;
            }

            // DINNER SLOT
            if (config.type === 'dinner') {
                dailyBlocks.push({
                    time: config.time,
                    activity: `Dinner in ${targetZone}`,
                    duration: config.duration!,
                    description: `Dining experience in the ${targetZone} area.`
                });
                continue;
            }

            // ACTIVITY SLOTS
            // Pick BEST available POI
            const count = config.max || 1;
            for (let c = 0; c < count; c++) {
                let selectedPOI = null;

                // 1. Iconic in Zone
                const iconicInZone = zonePOIs.find(p => isIconic(p));
                if (iconicInZone) selectedPOI = iconicInZone;
                // 2. Standard in Zone
                else if (zonePOIs.length > 0) selectedPOI = zonePOIs[0];
                // 3. Fallback Iconic
                else if (fallbackPOIs.some(p => isIconic(p))) selectedPOI = fallbackPOIs.find(p => isIconic(p));
                // 4. Fallback Any
                else if (fallbackPOIs.length > 0) selectedPOI = fallbackPOIs[0];

                if (selectedPOI) {
                    const duration = getDuration(selectedPOI.category, pace);
                    const travelTime = dailyBlocks.length > 0 ? estimateTravelTime(lastLocation, selectedPOI.location) : "Start";

                    dailyBlocks.push({
                        time: `${config.time}${count > 1 ? ` (${c + 1})` : ''}`,
                        activity: `Visit ${selectedPOI.name}`,
                        duration: duration,
                        description: `Experience ${selectedPOI.category} in ${selectedPOI.location.zone || 'Dubai'}. Travel: ${travelTime}.`
                    });

                    usedPOI_IDs.add(selectedPOI.id);
                    lastLocation = selectedPOI.location;
                    zonePOIs = zonePOIs.filter(p => p.id !== selectedPOI.id);
                    fallbackPOIs = fallbackPOIs.filter(p => p.id !== selectedPOI.id);
                } else {
                    // NO POI LEFT - Add filler check?
                    // If we really run out, maybe skip slot
                }
            }
        }

        plans.push({
            day: i,
            blocks: dailyBlocks
        });
    }

    // MANDATE: Cultural Check (Must include Al Fahidi/Museum if missing)
    const tripHasCultural = plans.some(d => d.blocks.some(b => /museum|souk|mosque|heritage|fahidi/i.test(b.activity)));

    if (!tripHasCultural && plans.length > 0) {
        // Insert at Day 1 Morning
        if (plans[0].blocks.length > 0 && plans[0].blocks[0].type !== 'lunch') {
            plans[0].blocks[0] = {
                time: 'Morning',
                activity: 'Visit Dubai Museum & Al Fahidi Fort',
                duration: '2 hours',
                description: 'Dive into history. Cultural Mandate.'
            };
        }
    }

    return {
        title: `Your ${days}-Day Dubai Adventure (${pace})`,
        days: plans
    };
}

export async function buildItineraryEdit(original: Itinerary, intent: EditIntent): Promise<Itinerary> {
    console.log(`[MCP: Builder] Editing itinerary... Intent: ${intent.change_type} on Day ${intent.target_day}`);

    // Deep clone to avoid mutating original directly in memory too early
    const updated = JSON.parse(JSON.stringify(original));

    if (!intent.target_day) return updated;

    const dayIndex = updated.days.findIndex((d: any) => d.day === intent.target_day);
    if (dayIndex === -1) return updated;

    const dayPlan = updated.days[dayIndex];

    // Apply dummy logic based on change type
    // Apply logic based on change type
    if (intent.change_type === 'make_more_relaxed') {
        // STRICT LOGIC: Remove one activity (the last one usually) and add a "Relaxation" block
        if (dayPlan.blocks.length > 1) {
            const removed = dayPlan.blocks.pop(); // Remove last activity
            console.log(`[MCP: Builder] Removed activity: ${removed?.activity} to relax schedule.`);

            dayPlan.blocks.push({
                time: 'Late Afternoon',
                activity: 'Free Time & Relaxation',
                duration: '2 hours'
            });
        }
    }
    else if (intent.change_type === 'swap_activity') {
        // Just mock a swap
        dayPlan.blocks.forEach((block: any) => {
            if (!intent.target_block || block.time.toLowerCase().includes(intent.target_block.toLowerCase())) {
                block.activity = "New " + block.activity + " (Swapped)";
            }
        });
    }
    else if (intent.change_type === 'add_place') {
        dayPlan.blocks.push({
            time: 'Late Night',
            activity: 'Dessert at Global Village',
            duration: '45 mins'
        });
    }

    // Pass back updated full object
    return updated;
}

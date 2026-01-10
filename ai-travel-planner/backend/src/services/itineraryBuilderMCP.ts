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
    const isRelaxed = pace === 'relaxed';
    const cat = category.toLowerCase();

    if (cat.includes('museum') || cat.includes('theme park')) return isRelaxed ? '3 hours' : '2.5 hours';
    if (cat.includes('mall') || cat.includes('souk') || cat.includes('market')) return isRelaxed ? '2.5 hours' : '1.5 hours';
    if (cat.includes('beach') || cat.includes('park')) return isRelaxed ? '3 hours' : '1 hour';
    if (cat.includes('restaurant') || cat.includes('cafe')) return isRelaxed ? '2 hours' : '1 hour';
    if (cat.includes('landmark') || cat.includes('sight')) return '45 mins';

    return '1.5 hours'; // Default
};


export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with ${pois.length} RAW POIs. Pace: ${pace}`);

    // FILTER: Apply Strict Validation First
    // FILTER: Apply Strict Validation First
    const validPOIs = pois.filter(p => sanitizeText(p.name) && isValidPOI(p));
    console.log(`[MCP: Builder] Validated POIs: ${validPOIs.length} / ${pois.length}`);

    const plans: DayPlan[] = [];
    const usedPOI_IDs = new Set<string>(); // Global Deduplication Trackers

    // Define Zone Priority per Day (Round Robin)
    const ZONES = ['Downtown', 'Old Dubai', 'Marina', 'Jumeirah', 'Other'];

    // Day 1 -> Downtown, Day 2 -> Old Dubai, Day 3 -> Marina, etc.
    const getZoneForDay = (dayNum: number) => ZONES[(dayNum - 1) % ZONES.length];

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];
        const targetZone = getZoneForDay(i);
        console.log(`[MCP: Builder] Day ${i} Priority Zone: ${targetZone}`);

        let slots = ['Morning', 'Afternoon', 'Evening'];
        let maxItems = 3;

        if (pace === 'relaxed') {
            slots = ['Morning', 'Late Afternoon', 'Dinner'];
            maxItems = 3;
        } else if (pace === 'packed') {
            slots = ['Morning', 'Lunch', 'Afternoon', 'Sunset', 'Dinner'];
            maxItems = 5;
        }

        let dayItemCount = 0;
        let lastLocation = null; // For travel time calc

        // Filter POIs for this Day's Zone (Using Validated List)
        let zonePOIs = validPOIs.filter(p => !usedPOI_IDs.has(p.id) && (p.location.zone === targetZone || (!p.location.zone && targetZone === 'Other')));

        // If we run out of zone specific items, allow fallback to high score items globally
        let fallbackPOIs = validPOIs.filter(p => !usedPOI_IDs.has(p.id) && p.location.zone !== targetZone);

        for (const slot of slots) {
            if (dayItemCount >= maxItems) break;

            let selectedPOI = null;

            // STRATEGY: 
            // 1. Try to find an ICONIC item in the ZONE (Best case)
            // 2. Try to find ANY item in the ZONE
            // 3. Fallback to ICONIC item ANYWHERE (If zone is dry)

            // 1. Iconic in Zone
            const iconicInZone = zonePOIs.find(p => isIconic(p));
            if (iconicInZone) {
                selectedPOI = iconicInZone;
            }
            // 2. Standard in Zone
            else if (zonePOIs.length > 0) {
                selectedPOI = zonePOIs[0]; // Already sorted by score
            }
            // 3. Fallback Iconic (Sacrifice geography for quality)
            else if (fallbackPOIs.some(p => isIconic(p))) {
                selectedPOI = fallbackPOIs.find(p => isIconic(p));
            }
            // 4. Fallback Any
            else if (fallbackPOIs.length > 0) {
                selectedPOI = fallbackPOIs[0];
            }

            if (selectedPOI) {
                const duration = getDuration(selectedPOI.category, pace);
                const travelTime = slots.indexOf(slot) > 0 ? estimateTravelTime(lastLocation, selectedPOI.location) : "Start";

                dailyBlocks.push({
                    time: slot,
                    activity: `Visit ${selectedPOI.name} (${selectedPOI.location.zone || 'Dubai'})`,
                    duration: duration,
                    description: `Experience ${selectedPOI.category}. Travel: ${travelTime}.`
                });

                dayItemCount++;
                usedPOI_IDs.add(selectedPOI.id);
                lastLocation = selectedPOI.location;

                // Refresh lists
                zonePOIs = zonePOIs.filter(p => p.id !== selectedPOI.id);
                fallbackPOIs = fallbackPOIs.filter(p => p.id !== selectedPOI.id);
            }
        }

        // Ensure at least 2 items per day
        if (dailyBlocks.length < 2) {
            dailyBlocks.push({
                time: 'Evening',
                activity: `Explore Local Area in ${targetZone}`,
                duration: '1 hour',
                description: 'Relaxed walking tour.'
            });
        }

        plans.push({
            day: i,
            blocks: dailyBlocks
        });
    }

    // TRIP-LEVEL VALIDATION
    const tripHasCultural = plans.some(d => d.blocks.some(b => /museum|souk|mosque|heritage/i.test(b.activity)));

    if (!tripHasCultural && plans.length > 0) {
        plans[0].blocks[0] = {
            time: 'Morning',
            activity: 'Visit Dubai Museum & Al Fahidi Fort (Cultural Mandate)',
            duration: '2 hours',
            description: 'Dive into history. Travel: 15 mins taxi.'
        };
    }

    return {
        title: `Your ${days}-Day Dubai Adventure (${pace} pace)`,
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

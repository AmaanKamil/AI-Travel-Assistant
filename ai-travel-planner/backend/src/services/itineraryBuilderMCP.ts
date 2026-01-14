import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

// Helper to identify "Iconic" POIs
const isIconic = (poi: any) => poi.score >= 50 || poi.metadata?.source === 'Seed';

// --- CURATED RESTAURANT POOL (Fix B) ---
const RESTAURANT_POOL: Record<string, string[]> = {
    'Downtown': ['Zuma', 'Armani Ristorante', 'Social House', 'Thiptara', 'La Serre', 'Karam Beirut', 'Claw BBQ'],
    'Old Dubai': ['Al Fanar', 'Arabian Tea House', 'Ravi Restaurant', 'Sikka Café', 'XVA Café', 'Aroos Damascus'],
    'Marina': ['Pier 7', 'Bussola', 'The Cheesecake Factory', 'Asia Asia', 'Fish Beach Taverna', 'The MAINE Oyster Bar', 'Catch 22'],
    'Jumeirah': ['Nobu', 'Ossiano', '101 Dining Lounge', 'The Beach House', 'Maiden Shanghai'],
    'Other': ['Local Gem', 'Hidden Cafe', 'Street Food Market']
};

const getRestaurantForZone = (zone: string, dayNum: number, type: 'lunch' | 'dinner'): string => {
    const pool = RESTAURANT_POOL[zone] || RESTAURANT_POOL['Other'];
    // Deterministic rotation based on day and type
    const index = (dayNum * (type === 'lunch' ? 2 : 3)) % pool.length;
    return pool[index];
};

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
    if (!poi.category || !poi.location || !poi.location.lat || !poi.location.lng) return false;
    return true;
};

// --- TIMING HELPERS (Fix C) ---
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const estimateTravelTime = (prevLoc: any, currLoc: any): string => {
    if (!prevLoc || !currLoc) return "Start";

    const dist = haversineDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
    const timeInMins = Math.round((dist / 30) * 60); // 30km/h avg speed

    if (dist < 2) return "10-20 mins (Same Area)";
    if (dist < 10) return "25-40 mins (Nearby)";
    return "45-60 mins (Travel)";
};

const getDuration = (category: string, name: string): string => {
    const cat = category.toLowerCase();
    const lcName = name.toLowerCase();

    // Iconic rules
    if (lcName.includes('burj') || lcName.includes('frame') || lcName.includes('future')) return '3 hours';
    if (lcName.includes('atlantis')) return '3 hours';

    // Category rules
    if (cat.includes('mall') || cat.includes('souk')) return '2.5 hours';
    if (cat.includes('museum')) return '90 mins';
    if (cat.includes('safari')) return '5 hours';
    if (cat.includes('walk') || cat.includes('fahidi')) return '2 hours';

    return '90 mins'; // Default
};

export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with strict slots.`);

    const validPOIs = pois.filter(p => sanitizeText(p.name) && isValidPOI(p));
    const plans: DayPlan[] = [];
    const usedPOI_IDs = new Set<string>();

    const ZONES = ['Downtown', 'Old Dubai', 'Marina', 'Jumeirah', 'Other'];
    const getZoneForDay = (dayNum: number) => ZONES[(dayNum - 1) % ZONES.length];

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];
        const targetZone = getZoneForDay(i);

        let lastLocation: any = null;
        let zonePOIs = validPOIs.filter(p => !usedPOI_IDs.has(p.id) && (p.location.zone === targetZone || (!p.location.zone && targetZone === 'Other')));
        let fallbackPOIs = validPOIs.filter(p => !usedPOI_IDs.has(p.id) && p.location.zone !== targetZone);

        // --- STRICT SLOTS (Fix A) ---
        // 1. Morning: Sightseeing (No Lunch/Dinner)
        // 2. Lunch: Fixed 45m
        // 3. Afternoon: Activity
        // 4. Dinner: Fixed 45m
        // 5. Evening: Optional

        const slots = [
            { time: 'Morning', type: 'activity', max: 1 },
            { time: '12:30 PM', type: 'lunch', duration: '45 mins', fixed: true },
            { time: 'Afternoon', type: 'activity', max: pace === 'packed' ? 2 : 1 },
            { time: '07:00 PM', type: 'dinner', duration: '45 mins', fixed: true }
        ];

        if (pace === 'packed') {
            slots.push({ time: 'Late Evening', type: 'activity', max: 1 });
        }

        for (const slot of slots) {

            // LUNCH & DINNER (Fix B)
            if (slot.type === 'lunch' || slot.type === 'dinner') {
                const restaurant = getRestaurantForZone(targetZone, i, slot.type as 'lunch' | 'dinner');
                dailyBlocks.push({
                    time: slot.time,
                    activity: `${slot.type === 'lunch' ? 'Lunch' : 'Dinner'} at ${restaurant}`,
                    duration: slot.duration!,
                    description: `Enjoy ${slot.type} at ${restaurant}, a top detailed choice in ${targetZone}.`,
                    type: slot.type as any,
                    fixed: true
                });
                continue;
            }

            // ACTIVITIES
            const count = slot.max || 1;
            for (let k = 0; k < count; k++) {
                let selectedPOI = null;

                // Priority Logic
                if (zonePOIs.length > 0) selectedPOI = zonePOIs[0];
                else if (fallbackPOIs.length > 0) selectedPOI = fallbackPOIs[0];

                if (selectedPOI) {
                    const duration = getDuration(selectedPOI.category, selectedPOI.name);
                    const travel = estimateTravelTime(lastLocation, selectedPOI.location);

                    dailyBlocks.push({
                        time: slot.time,
                        activity: `Visit ${selectedPOI.name}`,
                        duration: duration,
                        description: `Explore ${selectedPOI.category}. Travel: ${travel}.`,
                        type: 'activity',
                        fixed: false
                    });

                    usedPOI_IDs.add(selectedPOI.id);
                    lastLocation = selectedPOI.location;
                    zonePOIs = zonePOIs.filter(p => p.id !== selectedPOI.id);
                    fallbackPOIs = fallbackPOIs.filter(p => p.id !== selectedPOI.id);
                }
            }
        }

        plans.push({ day: i, blocks: dailyBlocks });
    }

    return {
        title: `Your ${days}-Day Dubai Adventure (${pace})`,
        days: plans
    };
}

export async function buildItineraryEdit(original: Itinerary, intent: EditIntent): Promise<Itinerary> {
    // Moved complex logic to editEngine.ts, this is now a passthrough if needed
    // or we can remove this if orchestrator calls editEngine directly.
    // For safety, we keep a minimal version or delegate.
    return original;
}

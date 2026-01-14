import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

// Helper to identify "Iconic" POIs
const isIconic = (poi: any) => poi.score >= 50 || poi.metadata?.source === 'Seed';

// --- CURATED RESTAURANT POOL (Fix B & D) ---
type Restaurant = { id: string; name: string; cuisine: string; area: string };

const RESTAURANT_POOL: Record<string, Restaurant[]> = {
    'Downtown': [
        { id: 'dt1', name: 'Zuma', cuisine: 'Contemporary Japanese', area: 'Downtown' },
        { id: 'dt2', name: 'Thiptara', cuisine: 'Thai cuisine with fountain views', area: 'Downtown' },
        { id: 'dt3', name: 'Social House', cuisine: 'International flavors', area: 'Downtown' },
        { id: 'dt4', name: 'Armani Ristorante', cuisine: 'Italian fine dining', area: 'Downtown' }
    ],
    'Old Dubai': [
        { id: 'od1', name: 'Al Fanar', cuisine: 'Authentic Emirati seafood', area: 'Old Dubai' },
        { id: 'od2', name: 'Arabian Tea House', cuisine: 'Traditional Emirati breakfast & lunch', area: 'Old Dubai' },
        { id: 'od3', name: 'XVA Café', cuisine: 'Vegetarian Middle Eastern', area: 'Old Dubai' }
    ],
    'Marina': [
        { id: 'dm1', name: 'Pier 7', cuisine: 'Multi-story fine dining', area: 'Dubai Marina' },
        { id: 'dm2', name: 'The MAINE Oyster Bar', cuisine: 'Seafood brasserie', area: 'JBR' },
        { id: 'dm3', name: 'Asia Asia', cuisine: 'Pan-Asian fusion', area: 'Dubai Marina' }
    ],
    'Jumeirah': [
        { id: 'jum1', name: '3 Fils', cuisine: 'Modern Asian seafood', area: 'Jumeirah Fishing Harbour' },
        { id: 'jum2', name: 'The Hamptons Cafe', cuisine: 'Mediterranean inspired', area: 'Jumeirah' }
    ],
    'Other': [
        { id: 'oth1', name: 'Local Gem', cuisine: 'Authentic local dishes', area: 'Dubai' },
        { id: 'oth2', name: 'Hidden Garden', cuisine: 'International fusion', area: 'Dubai' }
    ]
};

const getRestaurantForZone = (zone: string, dayNum: number, type: 'lunch' | 'dinner'): Restaurant => {
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
        // 3. Afternoon: Activity (No Dinner)
        // 4. Dinner: Fixed 45m
        // 5. Evening: Optional (No Lunch)

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

                // Format: Name \n Cuisine, Zone
                const activityName = `${slot.type === 'lunch' ? 'Lunch' : 'Dinner'} at ${restaurant.name}`;
                const description = `${restaurant.cuisine}, ${restaurant.area}`;

                dailyBlocks.push({
                    time: slot.time,
                    activity: activityName,
                    duration: slot.duration!,
                    description: description,
                    type: slot.type as any,
                    fixed: true
                });
                continue;
            }

            // ACTIVITIES (Strict Contamination Check)
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

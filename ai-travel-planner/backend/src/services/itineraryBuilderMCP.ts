import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';
import { validateAndNormalizeItinerary } from '../utils/itineraryValidator';

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

const getRestaurantForZone = (zone: string, dayNum: number, type: 'lunch' | 'dinner', usedNames: Set<string>): Restaurant => {
    const pool = RESTAURANT_POOL[zone] || RESTAURANT_POOL['Other'];

    // Attempt deterministic rotation first
    let index = (dayNum * (type === 'lunch' ? 2 : 3)) % pool.length;
    let candidate = pool[index];

    // Deduplication check
    if (usedNames.has(candidate.name)) {
        // Try to find ANY unused one in the pool
        const unused = pool.find(r => !usedNames.has(r.name));
        if (unused) {
            candidate = unused;
        } else {
            // Check global 'Other' pool if zone is exhausted
            const globalUnused = RESTAURANT_POOL['Other'].find(r => !usedNames.has(r.name));
            if (globalUnused) candidate = globalUnused;
            // Else accept duplicate as last resort (or handle gracefully)
        }
    }

    usedNames.add(candidate.name); // Mark as used
    return candidate;
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

    // Strict buckets per requirements
    // Same area (< 3km) -> 10 to 15 mins
    if (dist < 3) return "10-15 mins";
    // Nearby areas (< 10km) -> 20 to 30 mins
    if (dist < 10) return "20-30 mins";
    // Far areas (>= 10km) -> 35 to 50 mins
    return "35-50 mins";
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

// --- FAMOUS POIS (Fix 3: Seeding) ---
const FAMOUS_POIS = [
    { id: 'f1', name: 'Burj Khalifa', category: 'Landmark', location: { lat: 25.1972, lng: 55.2744, zone: 'Downtown' }, score: 100 },
    { id: 'f2', name: 'Dubai Mall', category: 'Mall', location: { lat: 25.1988, lng: 55.2796, zone: 'Downtown' }, score: 99 },
    { id: 'f3', name: 'Dubai Fountain', category: 'Show', location: { lat: 25.1965, lng: 55.2755, zone: 'Downtown' }, score: 98 },
    { id: 'f4', name: 'Palm Jumeirah', category: 'Landmark', location: { lat: 25.1124, lng: 55.1390, zone: 'Palm' }, score: 97 },
    { id: 'f5', name: 'Dubai Marina Walk', category: 'Walk', location: { lat: 25.0784, lng: 55.1406, zone: 'Marina' }, score: 96 },
    { id: 'f6', name: 'Desert Safari', category: 'Adventure', location: { lat: 24.8, lng: 55.5, zone: 'Desert' }, score: 95 },
    { id: 'f7', name: 'Al Fahidi Historic District', category: 'History', location: { lat: 25.2635, lng: 55.2972, zone: 'Old Dubai' }, score: 94 },
    { id: 'f8', name: 'Souk Madinat Jumeirah', category: 'Souk', location: { lat: 25.1332, lng: 55.1852, zone: 'Jumeirah' }, score: 93 },
    { id: 'f9', name: 'Global Village', category: 'Attraction', location: { lat: 25.0677, lng: 55.3004, zone: 'Other' }, score: 92 },
    { id: 'f10', name: 'Aura Skypool', category: 'View', location: { lat: 25.1097, lng: 55.1415, zone: 'Palm' }, score: 91 }
];

export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with strict slots.`);

    // MERGE & PRIORITIZE
    // We treat incoming POIs as "search results" but we ALWAYS want famous ones available.
    // Filter duplicates by ID or Name
    const famousIds = new Set(FAMOUS_POIS.map(p => p.id));
    const mergedPOIs = [...FAMOUS_POIS, ...pois.filter(p => !famousIds.has(p.id) && sanitizeText(p.name) && isValidPOI(p))];

    // Sort logic: Famous first, then high score
    mergedPOIs.sort((a, b) => (b.score || 0) - (a.score || 0));

    const plans: DayPlan[] = [];

    // --- GLOBAL DEDUPLICATION STATE ---
    const usedPOI_IDs = new Set<string>();
    const usedPlaceNames = new Set<string>(); // Strict duplicate name check

    const ZONES = ['Downtown', 'Old Dubai', 'Marina', 'Palm', 'Jumeirah']; // Added Palm
    const getZoneForDay = (dayNum: number) => ZONES[(dayNum - 1) % ZONES.length];

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];
        const targetZone = getZoneForDay(i);

        let lastLocation: any = null;

        // ZONE FILTERING
        // We want famous stuff in the zone FIRST
        // If not enough, extend to "Others"
        // Also Filter out used IDs AND used Names
        let zonePOIs = mergedPOIs.filter(p => !usedPOI_IDs.has(p.id) && !usedPlaceNames.has(p.name) && (p.location.zone === targetZone || p.location.zone === 'Other'));
        let fallbackPOIs = mergedPOIs.filter(p => !usedPOI_IDs.has(p.id) && !usedPlaceNames.has(p.name) && p.location.zone !== targetZone);

        // --- STRICT LINEAR ALGORITHM (Fix: No Slots) ---
        // 1. SELECT ATTRACTIONS (2-3)
        // 2. INSERT LUNCH (Restaurant)
        // 3. ADD 1 ACTIVITY
        // 4. INSERT DINNER (Restaurant)

        let dayActivities = [];

        // Step 1: Pick 2-3 Attractions (Famous First)
        // We use 'zonePOIs' first, then 'fallback'.
        let pool = [...zonePOIs, ...fallbackPOIs];
        const countStep1 = pace === 'relaxed' ? 2 : 3;

        for (let k = 0; k < countStep1; k++) {
            if (pool.length > 0) {
                const selected = pool.shift(); // Take first (highest priority)
                if (selected && !usedPlaceNames.has(selected.name)) {
                    dayActivities.push(selected);
                    usedPOI_IDs.add(selected.id);
                    usedPlaceNames.add(selected.name); // Add to Name Set
                }
            }
        }

        dailyBlocks.push(...dayActivities.map(poi => ({
            id: `block-${Math.random().toString(36).substr(2, 9)}`,
            time: '',     // REMOVED explicit time
            slot: 'morning' as 'morning',
            activity: `Visit ${poi.name}`,
            duration: getDuration(poi.category, poi.name),
            description: `Explore ${poi.category}.`,
            type: 'ATTRACTION' as const,
            fixed: false,
            location: poi.location?.zone || poi.location?.name || '',
            category: 'Sightseeing' // UI fallback
        })));

        // Step 2: Insert Lunch
        const lunchSpot = getRestaurantForZone(targetZone, i, 'lunch', usedPlaceNames);
        dailyBlocks.push({
            id: `block-lunch-${i}`,
            time: '',    // REMOVED explicit time
            slot: 'afternoon' as 'afternoon',
            activity: `Lunch at ${lunchSpot.name}`,
            duration: '90 mins',
            description: `${lunchSpot.cuisine} • ${lunchSpot.area}`,
            type: 'MEAL', // Typed as MEAL
            mealType: 'lunch' as 'lunch',
            fixed: true,
            cuisine: lunchSpot.cuisine, // ADDED metadata
            category: 'Meal'
        });


        // Step 3: Add 1 more Activity
        if (pool.length > 0) {
            const selected = pool.shift();
            if (selected && !usedPlaceNames.has(selected.name) && !usedPOI_IDs.has(selected.id)) {
                usedPOI_IDs.add(selected.id);
                usedPlaceNames.add(selected.name);

                dailyBlocks.push({
                    id: `block-${Math.random().toString(36).substr(2, 9)}`,
                    time: '', // REMOVED explicit time
                    slot: 'afternoon',
                    activity: `Visit ${selected.name}`,
                    duration: getDuration(selected.category, selected.name),
                    description: `Explore ${selected.category}.`,
                    type: 'ATTRACTION',
                    fixed: false,
                    location: selected.location?.zone || selected.location?.name || '',
                    category: 'Sightseeing'
                });
            }
        }

        // Step 4: Insert Dinner
        const dinnerSpot = getRestaurantForZone(targetZone, i, 'dinner', usedPlaceNames);
        dailyBlocks.push({
            id: `block-dinner-${i}`,
            time: '', // REMOVED explicit time
            slot: 'evening' as 'evening',
            activity: `Dinner at ${dinnerSpot.name}`,
            duration: '90 mins',
            description: `${dinnerSpot.cuisine} • ${dinnerSpot.area}`,
            type: 'MEAL',
            mealType: 'dinner' as 'dinner',
            fixed: true,
            cuisine: dinnerSpot.cuisine, // ADDED metadata
            category: 'Meal'
        });

        plans.push({ day: i, blocks: dailyBlocks });
    }

    return validateAndNormalizeItinerary({
        title: `Your ${days}-Day Dubai Adventure (${pace})`,
        days: plans
    });
}

export async function buildItineraryEdit(original: Itinerary, intent: EditIntent): Promise<Itinerary> {
    // Moved complex logic to editEngine.ts, this is now a passthrough if needed
    // or we can remove this if orchestrator calls editEngine directly.
    // For safety, we keep a minimal version or delegate.
    return original;
}

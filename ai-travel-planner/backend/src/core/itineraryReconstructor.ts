import { ItineraryState, ItineraryItem, ItemType } from './itineraryNormalizer';

// TEMPLATE CONFIG
const MAX_MORNING_ACTIVITIES = 2;
const MAX_AFTERNOON_ACTIVITIES = 2;

export function reconstructItinerary(state: ItineraryState): ItineraryState {
    // 1. EXPLODE: Group items by Day
    const dayMap = new Map<number, ItineraryItem[]>();
    for (const item of state.items) {
        if (!dayMap.has(item.day)) dayMap.set(item.day, []);
        dayMap.get(item.day)!.push(item);
    }

    const reconstructedItems: ItineraryItem[] = [];

    // 2. REBUILD PER DAY
    // We assume days are 1..N. We iterate through the map keys.
    const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b);

    for (const day of sortedDays) {
        let items = dayMap.get(day) || [];

        // 1. DEDUPLICATE (Keep first occurrence)
        const seen = new Set<string>();
        const uniqueItems: ItineraryItem[] = [];
        items.forEach(item => {
            const key = item.title.toLowerCase().trim();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueItems.push(item);
            }
        });

        // 2. LINEAR ORDER ENFORCEMENT
        // We trust the input order usually, but let's ensure:
        // - No consecutive meals? (User didn't strictly say, but implied)
        // - Lunch AFTER activity
        // - Dinner LAST

        const activities = uniqueItems.filter(i => i.type === 'ATTRACTION' || i.type === 'REST');
        const lunches = uniqueItems.filter(i => i.type === 'MEAL_LUNCH');
        const dinners = uniqueItems.filter(i => i.type === 'MEAL_DINNER');

        // FORCE VALID STRUCTURE:
        // Act -> Act -> (Act?) -> Lunch -> Act -> Dinner

        // Strict Minimum: need 2 activities
        while (activities.length < 2) {
            activities.push({
                id: `auto-fill-${day}-${activities.length}`,
                day: day,
                title: 'Explore City Center',
                type: 'ATTRACTION',
                slot: 'MORNING',
                estVisitMins: 90,
                estTravelMins: 15,
                location: 'Downtown Dubai',
                description: 'Take a relaxing walk and explore the city center.'
            });
        }

        const validDayItems: ItineraryItem[] = [];

        // A. First 2 Activities
        validDayItems.push(activities.shift()!);
        validDayItems.push(activities.shift()!);

        // B. Optional 3rd Activity or Lunch
        if (activities.length > 0 && Math.random() > 0.5) {
            validDayItems.push(activities.shift()!);
        }

        // C. Lunch
        if (lunches.length > 0) {
            const l = lunches[0];
            l.title = formatMealTitle(l.title, 'Lunch');
            validDayItems.push(l);
        }

        // D. Remaining Activities
        while (activities.length > 0) {
            validDayItems.push(activities.shift()!);
        }

        // E. Dinner
        if (dinners.length > 0) {
            const d = dinners[0];
            d.title = formatMealTitle(d.title, 'Dinner');
            validDayItems.push(d);
        }

        // F. Slot Labeling (Just for UI grouping if needed, but UI will ignore)
        // We'll just give them sequential "slot" metadata or keep generic
        validDayItems.forEach((item, idx) => {
            if (idx < 2) item.slot = 'MORNING';
            else if (item.type === 'MEAL_DINNER') item.slot = 'EVENING';
            else item.slot = 'AFTERNOON';
        });

        reconstructedItems.push(...validDayItems);
    }

    // 3. RECALCULATE TRAVEL TIMES
    // We do this after slotting is finalized to ensure sequential logic is correct
    // (e.g. Morning 1 -> Morning 2 -> Lunch)
    // We restart the loop or just process the flat list if it was sorted by day/slot?
    // reconstructedItems is roughly sorted by Day loop, but let's be safe.
    // The loop above pushed day by day, so it IS sorted by day.

    // Simple linear scan for travel times
    for (let i = 0; i < reconstructedItems.length - 1; i++) {
        const current = reconstructedItems[i];
        const next = reconstructedItems[i + 1];

        if (current.day === next.day) {
            // Same day travel
            next.estTravelMins = estimateRealTravelTime(current, next);
        } else {
            // New day starts at 0 travel (assuming hotel start)
            // Or we could set first item of day to "from hotel" time if we knew hotel location
            // For now, first item travel is 0 or kept from original if sensible. 
            // Reconstructor initialization:
            // next.estTravelMins = 0; // handled by default or input
        }
    }

    console.log(`[BUILDER] Reconstructed ${reconstructedItems.length} items.`);

    return {
        items: reconstructedItems,
        metadata: {
            source: 'BUILDER',
            version: 1
        }
    };
}

function formatMealTitle(title: string, type: 'Lunch' | 'Dinner'): string {
    const raw = title
        .replace(/^Lunch at /i, "")
        .replace(/^Dinner at /i, "")
        .replace(/^Visit /i, "")
        .trim();
    return `${type} at ${raw}`;
}

// REAL TRAVEL LOGIC
function estimateRealTravelTime(from: ItineraryItem, to: ItineraryItem): number {
    // If no location data, fallback
    // We assume 'location' field or we parse it?? 
    // The current Item interface has optional location.
    // If missing, default to 20.

    // MOCK MATRIX LOGIC (since we don't have lat/long here yet, unless added to Item)
    // We'll use a heuristic on Title or specific Area field if valid.
    // User mentioned "Same zone: 15, Nearby: 25, Far: 40".

    // For now, let's just implement the buckets logic requested.
    // Since we don't have "Area" on item explicitly in the interface (it's optional location string),
    // we'll try to guess or use default "Nearby".

    // IMPROVEMENT: If we had Area, we would use it.
    // Let's assume location string implies area for now.

    if (!from.location || !to.location) return 20;

    // Fix: Handle object or string location
    let fromLocString = '';
    const fromL = from.location as any;
    if (typeof fromL === 'string') fromLocString = fromL;
    else if (fromL && typeof fromL === 'object') fromLocString = fromL.zone || '';

    let toLocString = '';
    const toL = to.location as any;
    if (typeof toL === 'string') toLocString = toL;
    else if (toL && typeof toL === 'object') toLocString = toL.zone || '';

    if (!fromLocString || !toLocString) return 20;

    const fromLoc = fromLocString.toLowerCase();
    const toLoc = toLocString.toLowerCase();

    if (fromLoc === toLoc) return 10; // Same place?

    // Simple keyword matching for zones
    const zones = ['downtown', 'marina', 'jumeirah', 'palm', 'creek', 'deira'];
    const fromZone = zones.find(z => fromLoc.includes(z));
    const toZone = zones.find(z => toLoc.includes(z));

    if (fromZone && toZone) {
        if (fromZone === toZone) return 15; // Same zone
        // Adjacent pairs (heuristic)
        const nearbyPairs = [
            ['downtown', 'jumeirah'],
            ['marina', 'jumeirah'],
            ['marina', 'palm'],
            ['creek', 'deira'],
            ['downtown', 'creek']
        ];
        const pair = [fromZone, toZone].sort().join('-');
        const isNearby = nearbyPairs.some(p => p.sort().join('-') === pair);

        if (isNearby) return 25;
        return 40; // Far
    }

    return 25; // Default nearby
}

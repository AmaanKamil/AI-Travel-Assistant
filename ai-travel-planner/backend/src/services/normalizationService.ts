import { Itinerary, TimeBlock, NormalizedItineraryItem, Source } from '../types/itinerary';

export function normalizeItinerary(itinerary: Itinerary): Itinerary {
    const normalizedCopy = JSON.parse(JSON.stringify(itinerary));

    normalizedCopy.days.forEach((day: any) => {
        const blocks = day.blocks || [];
        const normalizedBlocks: TimeBlock[] = [];
        const dayNumber = day.day;

        // 1. First Pass: Map to Normalized structure sans-context (like travel time)
        let processedItems: NormalizedItineraryItem[] = blocks.map((b: TimeBlock) => normalizeItem(b, dayNumber));

        // 2. Second Pass: Contextual Rules (Time Blocks & Travel Time)
        processedItems = applyContextualRules(processedItems);

        // 3. Map back to TimeBlock for compatibility + normalized fields
        day.blocks = processedItems.map((item: any) => ({
            // Preserve original ID & core fields for edit engine compatibility
            ...blocks.find((b: any) => b.id === item.id),
            ...item,
            // Back-fill legacy fields for safety until full migration
            timeOfDay: item.timeBlock,
            travelTime: item.travelTimeRange || undefined,
            source: item.sources[0]?.label,
            duration: item.durationRange
        }));
    });

    return normalizedCopy;
}

function normalizeItem(block: TimeBlock, day: number): NormalizedItineraryItem {
    const isMeal = block.type === 'MEAL' || !!block.mealType;
    const title = block.activity || 'Unknown Activity';
    const lowerTitle = title.toLowerCase();

    // Normalize Type
    let type: 'sightseeing' | 'meal' = 'sightseeing';
    if (isMeal || lowerTitle.includes('lunch') || lowerTitle.includes('dinner')) {
        type = 'meal';
    }

    // Normalize MealType
    let mealType: 'lunch' | 'dinner' | null = null;
    if (block.mealType === 'lunch' || lowerTitle.includes('lunch')) mealType = 'lunch';
    if (block.mealType === 'dinner' || lowerTitle.includes('dinner')) mealType = 'dinner';

    // Normalize Zone (Location)
    const zone = block.location || 'Unknown';

    // Normalize Duration
    const durationRange = getDeterministicDuration(block.category || '', title, type === 'meal');

    // Normalize Sources
    const sources = getDeterministicSources(title, type === 'meal');

    return {
        id: block.id,
        day,
        title,
        type,
        mealType,
        category: block.category || (type === 'meal' ? 'Restaurant' : 'Sightseeing'),
        zone,
        timeBlock: 'Morning', // Placeholder, calculated in Pass 2
        durationRange,
        travelTimeRange: null, // Placeholder, calculated in Pass 2
        cuisine: block.cuisine || null,
        sources
    };
}

function applyContextualRules(items: NormalizedItineraryItem[]): NormalizedItineraryItem[] {
    let currentSlot: 'Morning' | 'Afternoon' | 'Evening' = 'Morning';

    return items.map((item, index) => {
        // --- TIME BLOCK LOGIC ---
        // Rule: Lunch -> Afternoon
        if (item.mealType === 'lunch') {
            currentSlot = 'Afternoon';
        }
        // Rule: Dinner -> Evening
        if (item.mealType === 'dinner') {
            currentSlot = 'Evening';
        }

        // Rule: Allow manual overrides if logic fails? NO. STRICT RULES.
        // First item of day defaults to Morning unless it's Lunch.
        if (index === 0 && item.mealType !== 'lunch') {
            currentSlot = 'Morning';
        }

        item.timeBlock = currentSlot;

        // --- TRAVEL TIME LOGIC ---
        if (index === 0) {
            item.travelTimeRange = null;
        } else {
            const prev = items[index - 1];
            if (prev.zone === item.zone) {
                item.travelTimeRange = "15-30 mins by car";
            } else {
                item.travelTimeRange = "30-60 mins by car";
            }
        }

        return item;
    });
}

function getDeterministicDuration(category: string, name: string, isMeal: boolean): string {
    const cat = category.toLowerCase();
    const lcName = name.toLowerCase();

    if (isMeal) return "45 mins";

    // Famous Landmarks
    if (lcName.includes('burj') || lcName.includes('frame') || lcName.includes('aquarium') ||
        lcName.includes('global village') || lcName.includes('miracle garden')) {
        return "2-3 hours";
    }

    // Malls
    if (cat.includes('mall') || lcName.includes('mall') || cat.includes('shopping')) {
        return "2-3 hours";
    }

    // Default Sightseeing
    return "1-2 hours";
}

function getDeterministicSources(name: string, isMeal: boolean): Source[] {
    const lcName = name.toLowerCase();

    if (isMeal) {
        return [{ label: "Google Places / Tripadvisor", url: "" }];
    }

    if (lcName.includes('wikipedia') || lcName.includes('wikivoyage')) {
        // clean up existing messy source if passed in title? Unlikely but safe.
    }

    return [{ label: "OpenStreetMap / Wikivoyage", url: "" }];
}

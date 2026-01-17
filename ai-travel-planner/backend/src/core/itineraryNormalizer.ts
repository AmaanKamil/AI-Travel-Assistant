export type Slot = "MORNING" | "AFTERNOON" | "EVENING";

export type ItemType =
    | "ATTRACTION"
    | "MEAL_LUNCH"
    | "MEAL_DINNER"
    | "REST";

export interface ItineraryItem {
    id: string;
    title: string;
    type: ItemType;
    slot: Slot;
    day: number;
    estVisitMins: number; // Mapped from duration string parse
    estTravelMins: number; // Mapped from travel string parse
    restaurantCuisine?: string; // For meals
    description?: string; // Keep metadata
    location?: string;
    category?: string; // Preserved for normalization
    sources?: any[];   // Preserved for normalization
    explanation?: any; // Preserved for grounded answers
    coordinates?: { lat: number; lng: number }; // Preserved for travel time calc
}

export interface ItineraryState {
    items: ItineraryItem[];
    metadata?: {
        source: 'BUILDER';
        version: number;
    };
}

const SLOT_RULES: Record<ItemType, Slot[]> = {
    ATTRACTION: ["MORNING", "AFTERNOON", "EVENING"],
    MEAL_LUNCH: ["AFTERNOON"],
    MEAL_DINNER: ["EVENING"],
    REST: ["AFTERNOON", "EVENING"]
};

export function normalizeItinerary(state: ItineraryState): ItineraryState {
    const items = [...state.items];

    for (const item of items) {
        const allowedSlots = SLOT_RULES[item.type];

        // Enforce Slot Rules
        if (!allowedSlots.includes(item.slot)) {
            item.slot = allowedSlots[0];
        }

        // Enforce Title semantics
        if (item.type === "MEAL_LUNCH") {
            item.title = `Lunch at ${extractPlace(item.title)}`;
        }

        if (item.type === "MEAL_DINNER") {
            item.title = `Dinner at ${extractPlace(item.title)}`;
        }
    }

    // Deduplication Logic (User mentioned: "Keep earliest one")
    // We'll implement strict uniqueness for meals per day
    const seenLunchString = new Set<string>();
    const seenDinnerString = new Set<string>();
    const validItems: ItineraryItem[] = [];

    // Sort by Day then Slot (Morning=0, Afternoon=1, Evening=2)
    const slotWeight = { "MORNING": 0, "AFTERNOON": 1, "EVENING": 2 };
    items.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return slotWeight[a.slot] - slotWeight[b.slot];
    });

    for (const item of items) {
        const dayKey = `Day${item.day}`;
        if (item.type === "MEAL_LUNCH") {
            if (seenLunchString.has(dayKey)) continue; // Drop duplicate
            seenLunchString.add(dayKey);
        }
        if (item.type === "MEAL_DINNER") {
            if (seenDinnerString.has(dayKey)) continue; // Drop duplicate
            seenDinnerString.add(dayKey);
        }
        validItems.push(item);
    }

    return { items: validItems };
}

function extractPlace(title: string) {
    return title
        .replace(/^Lunch at /i, "")
        .replace(/^Dinner at /i, "")
        .replace(/^Visit /i, "") // Cleanup activities too if needed
        .trim();
}

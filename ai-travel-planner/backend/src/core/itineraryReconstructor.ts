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

        // SEPARATE INGREDIENTS
        const lunches = items.filter(i => i.type === 'MEAL_LUNCH');
        const dinners = items.filter(i => i.type === 'MEAL_DINNER');
        const activities = items.filter(i => i.type === 'ATTRACTION' || i.type === 'REST');

        // SELECT PRIMARIES (Deduplicate)
        const lunch = lunches[0]; // Take first, drop others
        const dinner = dinners[0]; // Take first, drop others

        // RE-SLOT ACTIVITIES
        // Bag of activities to distribute
        let remainingActivities = [...activities];

        // MORNING (09:00 - 12:00)
        // Take up to MAX_MORNING (e.g. 2)
        const morningSlot = remainingActivities.splice(0, MAX_MORNING_ACTIVITIES);
        morningSlot.forEach(item => {
            item.slot = 'MORNING';
        });

        // LUNCH (12:30 - 14:00)
        // Force Slot & Title
        if (lunch) {
            lunch.slot = 'AFTERNOON'; // UI renders 12:30 as header if checking time, or we rely on order
            // Actually, keep slot=AFTERNOON but ensure it's first in afternoon logic or handled by adapter?
            // The previous normalizer rule said Lunch=Afternoon.
            // Let's stick to the Adapter's mapping: 
            // Morning -> Morning
            // Lunch -> 12:30 PM (Afternoon)
            // Afternoon -> Afternoon
            // Dinner -> 07:00 PM (Evening)
            // Evening -> Evening

            // To ensure Lunch comes BEFORE Afternoon activities in strict sort:
            // We might need a stricter slot or sub-order.
            // For now, let's trust the Adapter's mapItemToBlock which sets time="12:30 PM" for MEAL_LUNCH.

            lunch.title = formatMealTitle(lunch.title, 'Lunch');
        }

        // AFTERNOON (14:00 - 18:00)
        // Take up to MAX_AFTERNOON (e.g. 2)
        const afternoonSlot = remainingActivities.splice(0, MAX_AFTERNOON_ACTIVITIES);
        afternoonSlot.forEach(item => {
            item.slot = 'AFTERNOON';
        });

        // DINNER (19:00 - 21:00)
        if (dinner) {
            dinner.slot = 'EVENING';
            dinner.title = formatMealTitle(dinner.title, 'Dinner');
        }

        // EVENING (21:00+)
        // Whatever is left goes to Evening (Nightlife, etc)
        const eveningSlot = remainingActivities;
        eveningSlot.forEach(item => {
            item.slot = 'EVENING';
        });

        // PUSH TO RESULT IN STRICT ORDER
        // Morning
        reconstructedItems.push(...morningSlot);
        // Lunch
        if (lunch) reconstructedItems.push(lunch);
        // Afternoon
        reconstructedItems.push(...afternoonSlot);
        // Dinner
        if (dinner) reconstructedItems.push(dinner);
        // Evening
        reconstructedItems.push(...eveningSlot);
    }

    return { items: reconstructedItems };
}

function formatMealTitle(title: string, type: 'Lunch' | 'Dinner'): string {
    const raw = title
        .replace(/^Lunch at /i, "")
        .replace(/^Dinner at /i, "")
        .replace(/^Visit /i, "")
        .trim();
    return `${type} at ${raw}`;
}

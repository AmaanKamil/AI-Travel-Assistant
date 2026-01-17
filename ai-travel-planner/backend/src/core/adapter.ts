import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { ItineraryState, ItineraryItem, ItemType, Slot } from './itineraryNormalizer';

// ADAPTER: Legacy -> Core
export function toCoreState(legacy: Itinerary): ItineraryState {
    const items: ItineraryItem[] = [];

    legacy.days.forEach((day: DayPlan) => {
        day.blocks.forEach((block: TimeBlock) => {
            items.push(mapBlockToItem(block, day.day));
        });
    });

    return { items };
}

// ADAPTER: Core -> Legacy
export function toLegacyItinerary(state: ItineraryState, title: string): Itinerary {
    const daysMap = new Map<number, TimeBlock[]>();

    // Sort items to ensure order
    const sortedItems = [...state.items].sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        // TRUST INPUT ORDER (Fix: Linear Flow)
        return 0;
    });

    sortedItems.forEach(item => {
        if (!daysMap.has(item.day)) daysMap.set(item.day, []);
        daysMap.get(item.day)!.push(mapItemToBlock(item));
    });

    const days: DayPlan[] = [];
    // Ensure contiguous days? Or just mapped days.
    // Let's assume contiguous 1..N based on items.
    const maxDay = Math.max(...sortedItems.map(i => i.day), 0);
    for (let i = 1; i <= maxDay; i++) {
        days.push({
            day: i,
            blocks: daysMap.get(i) || []
        });
    }

    return { title, days };
}

// HELPERS
function mapBlockToItem(block: TimeBlock, day: number): ItineraryItem {
    let type: ItemType = 'ATTRACTION';
    if (block.mealType === 'lunch') type = 'MEAL_LUNCH';
    else if (block.mealType === 'dinner') type = 'MEAL_DINNER';
    else if (block.type === 'other') type = 'REST';

    let slot: Slot = 'AFTERNOON';
    const t = (block.time || '').toLowerCase();
    if (t.includes('morning') || block.slot === 'morning') slot = 'MORNING';
    else if (t.includes('evening') || t.includes('07:00') || block.slot === 'evening') slot = 'EVENING';

    return {
        id: block.id || Math.random().toString(36),
        title: block.activity,
        type,
        slot,
        day,
        estVisitMins: parseDuration(block.duration || '90 mins'),
        estTravelMins: 0, // Logic to recalculate later?
        restaurantCuisine: block.description?.split('•')[0]?.trim(),
        description: block.description,
        location: block.location,
        category: block.category,
        sources: block.sources, // Keep the array if it exists
        explanation: (block as any).explanation, // Persist explanation
        coordinates: (block as any).coordinates // Persist coordinates
    };
}

function mapItemToBlock(item: ItineraryItem): TimeBlock {
    // Reconstruct display Time
    let timeDisplay = "Afternoon";
    if (item.slot === 'MORNING') timeDisplay = "Morning";
    if (item.slot === 'EVENING') timeDisplay = "Evening";
    if (item.type === 'MEAL_LUNCH') timeDisplay = "12:30 PM";
    if (item.type === 'MEAL_DINNER') timeDisplay = "07:00 PM";

    // Reconstruct Meal Type
    let mealType: 'lunch' | 'dinner' | undefined;
    if (item.type === 'MEAL_LUNCH') mealType = 'lunch';
    if (item.type === 'MEAL_DINNER') mealType = 'dinner';

    return {
        id: item.id,
        time: timeDisplay,
        slot: item.slot.toLowerCase() as any,
        type: item.type === 'ATTRACTION' ? 'activity' : 'meal', // simplified
        mealType,
        activity: item.title,
        duration: `${item.estVisitMins} mins` === '0 mins' ? 'varies' : `${item.estVisitMins} mins`, // simplified
        description: item.description,
        fixed: item.type !== 'ATTRACTION', // Meals are usually fixed
        category: item.category,
        sources: item.sources,
        explanation: item.explanation,
        coordinates: item.coordinates
    };
}

function parseDuration(dur: string): number {
    if (!dur) return 60;
    if (dur.includes('hour')) return parseFloat(dur) * 60;
    if (dur.includes('min')) return parseFloat(dur);
    return 60;
}

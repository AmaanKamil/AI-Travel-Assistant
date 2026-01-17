import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';

export function validateAndNormalizeItinerary(itinerary: Itinerary): Itinerary {
    const copy = JSON.parse(JSON.stringify(itinerary));

    copy.days.forEach((day: DayPlan) => {
        day.blocks = normalizeDayBlocks(day.blocks);
    });

    return copy;
}

function normalizeDayBlocks(blocks: TimeBlock[]): TimeBlock[] {
    let valid: TimeBlock[] = [...blocks];

    // --- STEP 1: TYPE ENFORCEMENT ---
    valid.forEach(b => {
        const titleValues = (b.activity || '').toLowerCase();

        if (titleValues.includes('lunch') || titleValues.includes('dinner') || titleValues.includes('breakfast')) {
            if (b.type !== 'MEAL') {
                b.type = 'MEAL';

                if (!b.mealType) {
                    if (titleValues.includes('lunch')) b.mealType = 'lunch';
                    else if (titleValues.includes('dinner')) b.mealType = 'dinner';
                    else if (titleValues.includes('breakfast')) b.mealType = 'breakfast';
                }
            }
        } else {
            // If not a meal but tagged as MEAL, fix it
            if (b.type === 'MEAL' && !b.mealType && !titleValues.includes('lunch') && !titleValues.includes('dinner') && !titleValues.includes('breakfast')) {
                b.type = 'ATTRACTION';
            }
        }

        // Ensure no legacy time exists
        b.time = '';
        b.slot = undefined;
    });

    // --- STEP 2: STRUCTURE & REBALANCING (Morning / Afternoon / Evening) ---
    const uniqueBlocks: TimeBlock[] = [];
    const found = { lunch: false, dinner: false, breakfast: false };

    // Deduplication First
    for (const b of valid) {
        if (b.type === 'MEAL' && b.mealType) {
            if (found[b.mealType]) continue;
            found[b.mealType] = true;
        }
        uniqueBlocks.push(b);
    }

    // Assign Time Slots based on Anchors
    let currentSlot: 'Morning' | 'Afternoon' | 'Evening' = 'Morning';

    uniqueBlocks.forEach((b, idx) => {
        // LUNCH triggers Afternoon (Inclusive)
        if (b.type === 'MEAL' && b.mealType === 'lunch') {
            currentSlot = 'Afternoon';
        }
        // DINNER triggers Evening (Inclusive)
        if (b.type === 'MEAL' && b.mealType === 'dinner') {
            currentSlot = 'Evening';
        }

        b.timeOfDay = currentSlot;

        // INJECT TRAVEL TIME
        if (idx > 0) {
            const prev = uniqueBlocks[idx - 1];
            // Simple heuristic lookup or default
            // If location strings differ, assume travel needed
            const loc1 = prev.location || 'City';
            const loc2 = b.location || 'City';

            if (loc1 !== loc2) {
                b.travelTime = "30-60 mins by car";
            } else {
                b.travelTime = "15-30 mins by car";
            }
        } else {
            b.travelTime = undefined; // First item has no travel time to it
        }

        // Ensure Source is present
        if (!b.source) {
            b.source = b.type === 'MEAL' ? 'Google Places / Tripadvisor' : 'OpenStreetMap / Wikivoyage';
        }
    });

    return uniqueBlocks;
}

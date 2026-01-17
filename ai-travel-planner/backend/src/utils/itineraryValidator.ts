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
            if (b.type === 'MEAL' && !titleValues.includes('lunch') && !titleValues.includes('dinner') && !titleValues.includes('breakfast')) {
                b.type = 'ATTRACTION';
            }
        }

        // Ensure no legacy time exists
        b.time = '';
        b.slot = undefined;
    });

    // --- STEP 2: MEAL UNIQUENESS (Preserve input order) ---
    const found = { lunch: false, dinner: false, breakfast: false };
    const uniqueBlocks: TimeBlock[] = [];

    for (const b of valid) {
        if (b.type === 'MEAL' && b.mealType) {
            if (found[b.mealType]) continue; // Skip duplicates
            found[b.mealType] = true;
        }
        uniqueBlocks.push(b);
    }

    return uniqueBlocks;
}

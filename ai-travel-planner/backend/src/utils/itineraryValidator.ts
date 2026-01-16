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
        const titleValues = b.activity.toLowerCase();

        // 3. Type Enforcement
        if (titleValues.includes('lunch') || titleValues.includes('dinner') || titleValues.includes('breakfast')) {
            // Updated to use uppercase MEAL if incorrectly tagged as 'meal' or activity
            if (b.type !== 'MEAL') {
                b.type = 'MEAL'; // Enforce new type

                // Guess mealType if missing
                if (!b.mealType) {
                    if (titleValues.includes('lunch')) b.mealType = 'lunch';
                    else if (titleValues.includes('dinner')) b.mealType = 'dinner';
                    else if (titleValues.includes('breakfast')) b.mealType = 'breakfast';
                }
            }
        }
    });

    // --- STEP 2: SLOT REASSIGNMENT ---
    valid.forEach(b => {
        if (!b.mealType) return;

        // Ensure Metadata is correct, but DO NOT add explicit times
        if (b.mealType === 'dinner' && b.slot !== 'evening') {
            b.slot = 'evening';
        }
        if (b.mealType === 'lunch' && b.slot !== 'afternoon') {
            b.slot = 'afternoon';
        }
        if (b.mealType === 'breakfast' && b.slot !== 'morning') {
            b.slot = 'morning';
        }
        // Force removed time label if legacy code added it
        if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(b.time || '')) {
            b.time = '';
        }
    });

    // --- STEP 3: SLOT SANITY (Remove illegal items) ---
    valid = valid.filter(b => {
        if (!b.slot) return true;

        if (b.slot === 'morning') {
            if (b.mealType === 'lunch' || b.mealType === 'dinner') return false;
        }
        if (b.slot === 'afternoon') {
            if (b.mealType === 'dinner') return false;
        }
        if (b.slot === 'evening') {
            if (b.mealType === 'lunch') return false;
        }
        return true;
    });

    // --- STEP 4: MEAL UNIQUENESS ---
    const found = { lunch: false, dinner: false, breakfast: false };
    const uniqueBlocks: TimeBlock[] = [];

    const slotOrder = { 'morning': 1, 'afternoon': 2, 'evening': 3 };
    valid.sort((a, b) => (slotOrder[a.slot] || 99) - (slotOrder[b.slot] || 99));

    for (const b of valid) {
        if ((b.type === 'MEAL' || b.type === 'meal') && b.mealType) {
            if (found[b.mealType]) continue;
            found[b.mealType] = true;
        }
        uniqueBlocks.push(b);
    }

    return uniqueBlocks;
}

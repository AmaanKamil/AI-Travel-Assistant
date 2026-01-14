import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';

export function validateAndNormalizeItinerary(itinerary: Itinerary): Itinerary {
    const copy = JSON.parse(JSON.stringify(itinerary));

    copy.days.forEach((day: DayPlan) => {
        // We assume blocks might be flat or already sorted. 
        // We process them all together.
        day.blocks = normalizeDayBlocks(day.blocks);
    });

    return copy;
}

function normalizeDayBlocks(blocks: TimeBlock[]): TimeBlock[] {
    let valid: TimeBlock[] = [...blocks];

    // --- STEP 1: TYPE ENFORCEMENT & TAGGING ---
    // Ensure all meals are typed correctly before we check slots
    valid.forEach(b => {
        const titleValues = b.activity.toLowerCase();

        // 3. Type Enforcement
        if (titleValues.includes('lunch') || titleValues.includes('dinner') || titleValues.includes('breakfast')) {
            if (b.type !== 'meal') {
                b.type = 'meal'; // Force type
                // Guess mealType if missing
                if (!b.mealType) {
                    if (titleValues.includes('lunch')) b.mealType = 'lunch';
                    else if (titleValues.includes('dinner')) b.mealType = 'dinner';
                    else if (titleValues.includes('breakfast')) b.mealType = 'breakfast';
                }
            }
        }

        // Remove "Sightseeing" category from meals (Mapped via description or category field implied)
        // In our data, 'category' is often in description or implicitly handled. 
        // We ensure type='meal' is the primary flag.
    });

    // --- STEP 2: SLOT REASSIGNMENT ---
    // Move items to their correct slots
    valid.forEach(b => {
        if (!b.mealType) return;

        if (b.mealType === 'dinner' && b.slot !== 'evening') {
            b.slot = 'evening';
            b.time = '07:00 PM'; // Enforce display time
        }
        if (b.mealType === 'lunch' && b.slot !== 'afternoon') {
            b.slot = 'afternoon';
            b.time = '12:30 PM';
        }
        if (b.mealType === 'breakfast' && b.slot !== 'morning') {
            b.slot = 'morning';
            b.time = '09:00 AM';
        }
    });

    // --- STEP 3: SLOT SANITY (Remove illegal items) ---
    valid = valid.filter(b => {
        if (!b.slot) return true; // Safety

        if (b.slot === 'morning') {
            // Remove lunch/dinner
            if (b.mealType === 'lunch' || b.mealType === 'dinner') return false;
        }
        if (b.slot === 'afternoon') {
            // Remove dinner (Lunch allowed)
            if (b.mealType === 'dinner') return false;
        }
        if (b.slot === 'evening') {
            // Remove lunch (Dinner allowed)
            if (b.mealType === 'lunch') return false;
        }
        return true;
    });

    // --- STEP 4: MEAL UNIQUENESS ---
    // Keep earliest lunch/dinner
    const found = { lunch: false, dinner: false, breakfast: false };
    const uniqueBlocks: TimeBlock[] = [];

    // Sort to ensure "Earliest" means something? 
    // We trust input order usually, or we can sort by Slot.
    // Let's sort by Slot Order: Morning -> Afternoon -> Evening
    const slotOrder = { 'morning': 1, 'afternoon': 2, 'evening': 3 };
    valid.sort((a, b) => (slotOrder[a.slot] || 99) - (slotOrder[b.slot] || 99));

    for (const b of valid) {
        if (b.type === 'meal' && b.mealType) {
            if (found[b.mealType]) continue; // Drop duplicate
            found[b.mealType] = true;
        }
        uniqueBlocks.push(b);
    }

    return uniqueBlocks;
}

import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';

// STRICT RULES
const RULES = {
    MORNING: { allow_lunch: false, allow_dinner: false },
    AFTERNOON: { allow_lunch: true, allow_dinner: false },
    EVENING: { allow_lunch: false, allow_dinner: true },
    LATE_NIGHT: { allow_lunch: false, allow_dinner: true }
};

export function validateAndNormalizeItinerary(itinerary: Itinerary): Itinerary {
    const copy = JSON.parse(JSON.stringify(itinerary));

    copy.days.forEach((day: DayPlan) => {
        day.blocks = normalizeDayBlocks(day.blocks);
    });

    return copy;
}

function normalizeDayBlocks(blocks: TimeBlock[]): TimeBlock[] {
    const validBlocks: TimeBlock[] = [];
    const mealsFound = { lunch: false, dinner: false };

    // 1. Sort blocks by approximate time (heuristic)
    // Morning -> Lunch -> Afternoon -> Dinner -> Evening
    // This is hard to do perfectly with strings, so we rely on the order passed in,
    // but we enforce the LABELS and CONTENT match.

    for (const block of blocks) {
        const timeLower = block.time.toLowerCase();
        let isValid = true;

        // CHECK CONTAMINATION
        if (timeLower.includes('morning')) {
            if (isMeal(block, 'lunch') || isMeal(block, 'dinner')) isValid = false;
        }
        else if (timeLower.includes('afternoon')) {
            if (isMeal(block, 'dinner')) isValid = false;
        }
        else if (timeLower.includes('evening') && !timeLower.includes('late')) {
            if (isMeal(block, 'lunch')) isValid = false;
        }

        // DE-DUPLICATION (Only 1 fixed lunch/dinner per day)
        if (block.type === 'lunch') {
            if (mealsFound.lunch) isValid = false;
            else mealsFound.lunch = true;
        }
        if (block.type === 'dinner') {
            if (mealsFound.dinner) isValid = false;
            else mealsFound.dinner = true;
        }

        // RECOVERY STRATEGY
        // If we found a "Dinner" in "Morning", can we save it?
        // Realistically, for this edit engine, if we moved it there, we probably wanted to *change* its time.
        // So we should Update the TIME label to match the TYPE if it's a fixed meal.
        if (!isValid && (block.type === 'lunch' || block.type === 'dinner')) {
            // It's a meal in the wrong spot. Let's fix the slot time instead of deleting it.
            if (block.type === 'lunch') {
                block.time = '12:30 PM';
                isValid = true;
            }
            if (block.type === 'dinner') {
                block.time = '07:00 PM';
                isValid = true;
            }
        }

        if (isValid) {
            validBlocks.push(block);
        }
    }

    // 2. Re-sort to ensure Fixed Meals are in correct visual order if we messed them up?
    // For now, simpler is better. Just filtering.

    return validBlocks;
}

function isMeal(block: TimeBlock, type: 'lunch' | 'dinner'): boolean {
    if (block.type === type) return true;
    if (block.activity.toLowerCase().includes(type)) return true;
    return false;
}

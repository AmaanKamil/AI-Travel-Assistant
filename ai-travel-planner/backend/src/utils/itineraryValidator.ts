import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';

import { normalizeItinerary } from '../services/normalizationService';

export function validateAndNormalizeItinerary(itinerary: Itinerary): Itinerary {
    // 1. Basic Structure Validation (Type Safety)
    const safeItinerary = ensureBasicStructure(itinerary);

    // 2. Deterministic Normalization
    return normalizeItinerary(safeItinerary);
}

function ensureBasicStructure(itinerary: Itinerary): Itinerary {
    const copy = JSON.parse(JSON.stringify(itinerary));
    if (!copy.days) copy.days = [];

    copy.days.forEach((day: DayPlan) => {
        if (!day.blocks) day.blocks = [];

        // Basic type patching before strict normalization
        day.blocks.forEach(b => {
            const titleValues = (b.activity || '').toLowerCase();

            // Restore MEAL type if lost
            if (titleValues.includes('lunch') || titleValues.includes('dinner')) {
                if (b.type !== 'MEAL') b.type = 'MEAL';
                if (!b.mealType && titleValues.includes('lunch')) b.mealType = 'lunch';
                if (!b.mealType && titleValues.includes('dinner')) b.mealType = 'dinner';
            }
        });
    });
    return copy;
}

// Deprecated: Internal logic moved to normalizationService
function normalizeDayBlocks(blocks: TimeBlock[]): TimeBlock[] {
    return blocks;
}

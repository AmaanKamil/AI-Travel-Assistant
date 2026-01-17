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

    // --- DURATION HELPER ---
    const getDuration = (category: string, name: string, isMeal: boolean): string => {
        const cat = (category || '').toLowerCase();
        const lcName = (name || '').toLowerCase();

        if (isMeal || cat.includes('meal') || lcName.includes('lunch') || lcName.includes('dinner')) {
            return '45 mins';
        }

        // Iconic rules
        if (lcName.includes('burj') || lcName.includes('frame') || lcName.includes('future') || lcName.includes('atlantis')) return '2-3 hours';

        // Category rules
        if (cat.includes('mall') || cat.includes('souk')) return '2-3 hours';
        if (cat.includes('museum') || cat.includes('safari')) return '2-4 hours';
        if (cat.includes('walk') || cat.includes('fahidi')) return '1-2 hours';

        return '1-2 hours'; // Default
    };

    // Assign Time Slots based on Anchors
    let currentSlot: 'Morning' | 'Afternoon' | 'Evening' = 'Morning';

    uniqueBlocks.forEach((b, idx) => {
        const isMeal = b.type === 'MEAL' || !!b.mealType;

        // LUNCH triggers Afternoon (Inclusive)
        if (b.type === 'MEAL' && b.mealType === 'lunch') {
            currentSlot = 'Afternoon';
        }
        // DINNER triggers Evening (Inclusive)
        if (b.type === 'MEAL' && b.mealType === 'dinner') {
            currentSlot = 'Evening';
        }

        b.timeOfDay = currentSlot;

        // FORCE UPDATE DURATION (Fix Legacy Plans)
        // We always re-calculate to ensure consistency ("2-3 hours", "45 mins")
        // avoiding "120 mins" etc.
        b.duration = getDuration(b.category || '', b.activity, isMeal);

        // INJECT TRAVEL TIME
        if (idx > 0) {
            const prev = uniqueBlocks[idx - 1];
            const loc1 = prev.location || 'City';
            const loc2 = b.location || 'City';

            if (loc1 !== loc2) {
                b.travelTime = "30-60 mins by car";
            } else {
                b.travelTime = "15-30 mins by car";
            }
        } else {
            b.travelTime = undefined;
        }

        // Ensure Source is present
        if (!b.source) {
            b.source = isMeal ? 'Google Places / Tripadvisor' : 'OpenStreetMap / Wikivoyage';
        }
    });

    return uniqueBlocks;
}

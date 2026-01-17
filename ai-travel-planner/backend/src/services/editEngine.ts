import { Itinerary, TimeBlock } from '../types/itinerary';
import { validateAndNormalizeItinerary } from '../utils/itineraryValidator';

export type EditIntent = {
    change: 'relax' | 'swap_activity' | 'add_place' | 'move_activity' | 'replace_activity' | 'other';
    day: number; // Source Day
    target_day?: number | null; // Destination Day (for move/swap)

    change_type?: string;
    target_block?: 'morning' | 'afternoon' | 'evening' | null;
    raw_instruction?: string;
    new_activity?: string;
    itemId?: string; // IF UI sends ID
};

export function applyDeterministicEdit(
    itinerary: Itinerary,
    intent: EditIntent
): Itinerary {
    const copy: Itinerary = JSON.parse(JSON.stringify(itinerary));
    const operation = (intent.change_type || intent.change) as string;

    // --- 1. MOVE ACTIVITY (Strict ID based or Heuristic) ---
    if (operation === 'move_activity') {
        const sourceDayIdx = intent.day - 1;
        const targetDayIdx = (intent.target_day || intent.day) - 1;

        if (copy.days[sourceDayIdx] && copy.days[targetDayIdx]) {
            const sourceDay = copy.days[sourceDayIdx];
            const targetDay = copy.days[targetDayIdx];
            const targetSlot = intent.target_block || 'afternoon'; // Default target slot

            // FIND ITEM
            // Prefer ID if we had it, but currently intent might not have it.
            // Fallback to slot match or first non-fixed activity.
            const blockIndex = sourceDay.blocks.findIndex(b =>
                !b.fixed &&
                (!intent.target_block || b.slot === intent.target_block || (b.time || '').toLowerCase().includes(intent.target_block || ''))
            );

            if (blockIndex !== -1) {
                // DETACH
                const [movedBlock] = sourceDay.blocks.splice(blockIndex, 1);

                // TRANSFORM STATE (Crucial Step: Update internal state)
                movedBlock.slot = targetSlot; // Assign new slot
                movedBlock.description = (movedBlock.description || '') + ` [Moved]`;

                // INSERT (Append to day for now, Validator will sort it)
                targetDay.blocks.push(movedBlock);
            }
        }
    }

    // --- 2. RELAX DAY ---
    else if (operation === 'relax') {
        const sourceDay = copy.days[intent.day - 1];
        if (sourceDay) {
            // Remove first non-meal activity
            const idx = sourceDay.blocks.findIndex(b => b.type === 'activity');
            if (idx !== -1) sourceDay.blocks.splice(idx, 1);

            // Add Rest
            sourceDay.blocks.push({
                id: `rest-${Math.random()}`,
                time: 'Afternoon',
                slot: 'afternoon',
                type: 'other',
                activity: 'Relaxation Time',
                duration: '2 hours',
                description: 'Leisure time at hotel.',
                fixed: false
            });
        }
    }

    // FINAL PASS: MANDATORY VALIDATOR
    // This will sort the days, fix slot times, remove illegal meals, etc.
    return validateAndNormalizeItinerary(copy);
}

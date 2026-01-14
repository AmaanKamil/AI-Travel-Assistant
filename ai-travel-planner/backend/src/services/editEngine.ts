import { Itinerary, TimeBlock } from '../types/itinerary';

export type EditIntent = {
    change: 'relax' | 'swap_activity' | 'add_place' | 'move_activity' | 'replace_activity' | 'other';
    day: number; // Source Day
    target_day?: number | null; // Destination Day (for move/swap)
    change_type?: string;
    target_block?: 'morning' | 'afternoon' | 'evening' | null;
    raw_instruction?: string;
    new_activity?: string; // For replace/add
};

export function applyDeterministicEdit(
    itinerary: Itinerary,
    intent: EditIntent
): Itinerary {
    const copy: Itinerary = JSON.parse(JSON.stringify(itinerary));
    const sourceDayIdx = intent.day - 1;
    // Default target day to source day if not specified
    const targetDayIdx = (intent.target_day || intent.day) - 1;

    const sourceDay = copy.days[sourceDayIdx];
    const targetDay = copy.days[targetDayIdx];

    if (!sourceDay) return copy;

    const operation = (intent.change_type || intent.change) as string;

    // --- 1. MOVE ACTIVITY ---
    if (operation === 'move_activity' && targetDay) {
        // Find activity to move (heuristic: not meal, matches target_block or last activity)
        const blockIndex = sourceDay.blocks.findIndex(b =>
            !b.fixed &&
            (!intent.target_block || b.time.toLowerCase().includes(intent.target_block))
        );

        if (blockIndex !== -1) {
            // DETACH
            const [movedBlock] = sourceDay.blocks.splice(blockIndex, 1);

            // UPDATE METADATA
            movedBlock.description += ` [Moved from Day ${intent.day}]`;

            // RE-ATTACH (Insert before Dinner if exists, or append)
            const dinnerIdx = targetDay.blocks.findIndex(b => b.type === 'dinner');

            if (dinnerIdx !== -1) {
                targetDay.blocks.splice(dinnerIdx, 0, movedBlock);
            } else {
                targetDay.blocks.push(movedBlock);
            }

            // CLEANUP: If source day is now empty of activities (only meals), maybe add a "Free Time" filler?
            // For now, we leave it as is (lighter day).
        }
    }

    // --- 2. SWAP ITEMS ---
    else if (operation === 'swap_activity') {
        if (!targetDay) return copy;

        // Find blocks to swap (e.g. Evening Day 1 <-> Evening Day 2)
        // Default to Evening if not specified, or Afternoon
        const timeSlot = intent.target_block || 'afternoon';

        const sourceBlock = sourceDay.blocks.find(b => b.time.toLowerCase().includes(timeSlot) && !b.fixed);
        const targetBlock = targetDay.blocks.find(b => b.time.toLowerCase().includes(timeSlot) && !b.fixed);

        if (sourceBlock && targetBlock) {
            // Swap contents but keep times/metadata
            const tempActivity = sourceBlock.activity;
            const tempDesc = sourceBlock.description;
            const tempDur = sourceBlock.duration;

            sourceBlock.activity = targetBlock.activity;
            sourceBlock.description = targetBlock.description;
            sourceBlock.duration = targetBlock.duration;

            targetBlock.activity = tempActivity;
            targetBlock.description = tempDesc;
            targetBlock.duration = tempDur;
        }
    }

    // --- 3. RELAX DAY ---
    else if (operation === 'relax' || operation === 'make_more_relaxed') {
        // Rule: Remove 1 activity, increase rest, keep meals
        // Find non-fixed activity
        const activityIdx = sourceDay.blocks.findIndex(b => !b.fixed && (b.type === 'activity' || !b.type));

        if (activityIdx !== -1) {
            sourceDay.blocks.splice(activityIdx, 1); // Remove

            // Add Rest Block
            sourceDay.blocks.push({
                time: 'Afternoon Break',
                activity: 'Leisure & Hotel Rest',
                duration: '2 hours',
                description: 'Time to recharge.',
                type: 'other',
                fixed: false
            });
        }
    }

    // --- 4. REPLACE ACTIVITY ---
    else if (operation === 'replace_activity' || operation === 'other') {
        const block = sourceDay.blocks.find(b =>
            !b.fixed && (!intent.target_block || b.time.toLowerCase().includes(intent.target_block))
        );

        if (block) {
            block.activity = intent.new_activity || "Indoor Activity (Center for Cultural Understanding)";
            block.description = "Replaced based on request. Great indoor option.";
            block.duration = "2 hours";
        }
    }

    // --- 5. PACKED (Legacy Support) ---
    else if (operation === 'add_place') {
        sourceDay.blocks.push({
            time: 'Late Night',
            activity: 'Dessert or Late Night Stroll',
            duration: '45 mins',
            description: 'Wrap up the day with a quick visit nearby.',
            type: 'activity',
            fixed: false
        });
    }

    return copy;
}

import { Itinerary, TimeBlock, DayPlan } from '../types/itinerary';
import { EditOperation, EditIntentType } from '../types/edit';
import { validateAndNormalizeItinerary } from '../utils/itineraryValidator';

// --- HELPERS ---

function findDayIndex(itinerary: Itinerary, dayNum: number): number {
    return itinerary.days.findIndex(d => d.day === dayNum);
}

function findBlockIndex(blocks: TimeBlock[], fuzzyName: string): number {
    const lowerTarget = fuzzyName.toLowerCase();
    return blocks.findIndex(b =>
        b.activity.toLowerCase().includes(lowerTarget) ||
        (b.description && b.description.toLowerCase().includes(lowerTarget))
    );
}

function cloneItinerary(itinerary: Itinerary): Itinerary {
    return JSON.parse(JSON.stringify(itinerary));
}

// --- CORE ENGINE ---

export function applyDeterministicEdit(
    itinerary: Itinerary,
    operation: EditOperation
): Itinerary {
    const copy = cloneItinerary(itinerary);

    // Safety check: Day bounds
    if (operation.sourceDay < 1 && operation.intent !== EditIntentType.ADD_ITEM) {
        console.warn('[EditEngine] Invalid Source Day 0');
        return copy;
    }

    const sourceIdx = findDayIndex(copy, operation.sourceDay);
    const targetIdx = operation.targetDay ? findDayIndex(copy, operation.targetDay) : -1;

    console.log(`[EditEngine] Executing ${operation.intent} on Day ${operation.sourceDay}`);

    switch (operation.intent) {
        case EditIntentType.RELAX_DAY:
            handleRelaxDay(copy, sourceIdx);
            break;

        case EditIntentType.PACK_DAY:
            handlePackDay(copy, sourceIdx);
            break;

        case EditIntentType.MOVE_ITEM_WITHIN_DAY:
            handleMoveWithinDay(copy, sourceIdx, operation.itemToMove, operation.targetSlot);
            break;

        case EditIntentType.MOVE_ITEM_BETWEEN_DAYS:
            handleMoveBetweenDays(copy, sourceIdx, targetIdx, operation.itemToMove, operation.targetSlot);
            break;

        case EditIntentType.SWAP_DAYS:
            handleSwapDays(copy, sourceIdx, targetIdx);
            break;

        case EditIntentType.REMOVE_ITEM:
            handleRemoveItem(copy, sourceIdx, operation.itemToMove);
            break;

        default:
            console.warn('[EditEngine] Unknown intent', operation.intent);
    }

    // FINAL VALIDATION GATE
    return validateAndNormalizeItinerary(copy);
}

// --- HANDLERS ---

function handleSwapDays(itinerary: Itinerary, idxA: number, idxB: number) {
    if (idxA === -1 || idxB === -1) return;

    // Swap blocks only, keep Day ID/Number if needed? 
    // Usually user wants "Day 1 content" to be on "Day 2".

    const tempBlocks = [...itinerary.days[idxA].blocks];
    itinerary.days[idxA].blocks = [...itinerary.days[idxB].blocks];
    itinerary.days[idxB].blocks = tempBlocks;

    // Note: Validation will normalize meal slots if necessary, but swapping full days usually preserves structure.
}

function handleRelaxDay(itinerary: Itinerary, dayIdx: number) {
    if (dayIdx === -1) return;
    const day = itinerary.days[dayIdx];

    // Identify removable candidates (Non-Meals, Non-Fixed?)
    // Filter for 'ATTRACTION' logic
    const candidates = day.blocks.filter(b => b.type !== 'MEAL' && !b.mealType && b.type !== 'transfer');

    if (candidates.length === 0) return; // Nothing to remove

    // Scoring: Remove the one with longest duration or "intense" keywords?
    // Simple Heuristic: Remove the last non-dinner attraction (usually least critical) 
    // OR remove the one with 'hopping' or 'safari' if asking for relax.

    // Let's remove the LAST attraction before Dinner to give more breathing room
    // Find index of last attraction
    let targetId = candidates[candidates.length - 1].id;

    day.blocks = day.blocks.filter(b => b.id !== targetId);
}

function handlePackDay(itinerary: Itinerary, dayIdx: number) {
    /* 
     * Heuristic: "Pack" means add more stuff. 
     * Since we don't have a "Global Unused Pool" easily accessible here without fetching,
     * we can try to steal a short activity from another day that has too many,
     * OR strictly we should fail if we can't find something.
     * 
     * For MVP/Stability: We will refrain from inventing hallucinations.
     * If we can't find a source, we do nothing or add a generic "Walk".
     */
    if (dayIdx === -1) return;

    // Generic filler for "Packed" request
    itinerary.days[dayIdx].blocks.push({
        id: `packed-${Date.now()}`,
        activity: "Explore Local Markets",
        type: 'ATTRACTION',
        category: 'Shopping',
        description: "A quick visit to nearby souks or malls.",
        duration: '1 hour',
        fixed: false
    });
}

function insertAtSlot(blocks: TimeBlock[], block: TimeBlock, slot?: string) {
    if (!slot) {
        blocks.push(block);
        return;
    }

    const lunchIdx = blocks.findIndex(b => b.mealType === 'lunch');
    const dinnerIdx = blocks.findIndex(b => b.mealType === 'dinner');

    if (slot === 'morning') {
        // Insert before Lunch
        if (lunchIdx !== -1) {
            blocks.splice(lunchIdx, 0, block);
        } else {
            blocks.unshift(block);
        }
    } else if (slot === 'evening') {
        // Insert after Dinner (or at end)
        blocks.push(block);
    } else {
        // Afternoon: Insert after Lunch, before Dinner
        if (lunchIdx !== -1) {
            if (dinnerIdx !== -1 && dinnerIdx > lunchIdx) {
                blocks.splice(dinnerIdx, 0, block);
            } else {
                blocks.splice(lunchIdx + 1, 0, block);
            }
        } else if (dinnerIdx !== -1) {
            blocks.splice(dinnerIdx, 0, block);
        } else {
            blocks.push(block);
        }
    }
}

function handleMoveWithinDay(itinerary: Itinerary, dayIdx: number, itemName?: string, targetSlot?: string) {
    if (dayIdx === -1 || !itemName) return;
    const day = itinerary.days[dayIdx];

    const blockIdx = findBlockIndex(day.blocks, itemName);
    if (blockIdx === -1) return;

    const [block] = day.blocks.splice(blockIdx, 1);

    insertAtSlot(day.blocks, block, targetSlot);
}

function handleMoveBetweenDays(itinerary: Itinerary, srcIdx: number, tgtIdx: number, itemName?: string, targetSlot?: string) {
    if (srcIdx === -1 || tgtIdx === -1 || !itemName) return;

    const srcDay = itinerary.days[srcIdx];
    const tgtDay = itinerary.days[tgtIdx];

    const blockIdx = findBlockIndex(srcDay.blocks, itemName);
    if (blockIdx === -1) return;

    const [block] = srcDay.blocks.splice(blockIdx, 1);

    insertAtSlot(tgtDay.blocks, block, targetSlot || 'afternoon');
}

function handleRemoveItem(itinerary: Itinerary, dayIdx: number, itemName?: string) {
    if (dayIdx === -1 || !itemName) return;
    const day = itinerary.days[dayIdx];

    const blockIdx = findBlockIndex(day.blocks, itemName);
    if (blockIdx === -1) return;

    const block = day.blocks[blockIdx];
    if (block.type === 'MEAL' || block.mealType) {
        // PROTECT MEALS
        return;
    }

    day.blocks.splice(blockIdx, 1);
}

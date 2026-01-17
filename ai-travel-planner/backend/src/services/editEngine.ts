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

// --- TYPES ---
export interface EditResult {
    success: boolean;
    itinerary: Itinerary;
    message: string;
}

export function applyDeterministicEdit(
    itinerary: Itinerary,
    operation: EditOperation
): EditResult {
    const copy = cloneItinerary(itinerary);

    // Safety check: Day bounds
    if (operation.sourceDay < 1 && operation.intent !== EditIntentType.ADD_ITEM) {
        console.warn('[EditEngine] Invalid Source Day 0');
        return { success: false, itinerary: copy, message: "I couldn't identify strictly which day you were referring to." };
    }

    const sourceIdx = findDayIndex(copy, operation.sourceDay);
    const targetIdx = operation.targetDay ? findDayIndex(copy, operation.targetDay) : -1;

    console.log(`[EditEngine] Executing ${operation.intent} on Day ${operation.sourceDay}`);

    switch (operation.intent) {
        case EditIntentType.RELAX_DAY:
            return handleRelaxDay(copy, sourceIdx, operation.sourceDay);

        case EditIntentType.PACK_DAY:
            return handlePackDay(copy, sourceIdx, operation.sourceDay);

        case EditIntentType.MOVE_ITEM_WITHIN_DAY:
            return handleMoveWithinDay(copy, sourceIdx, operation.itemToMove, operation.targetSlot, operation.sourceDay);

        case EditIntentType.MOVE_ITEM_BETWEEN_DAYS:
            return handleMoveBetweenDays(copy, sourceIdx, targetIdx, operation.itemToMove, operation.targetSlot, operation.sourceDay, operation.targetDay!);

        case EditIntentType.SWAP_DAYS:
            return handleSwapDays(copy, sourceIdx, targetIdx, operation.sourceDay, operation.targetDay!);

        case EditIntentType.REMOVE_ITEM:
            return handleRemoveItem(copy, sourceIdx, operation.itemToMove, operation.sourceDay);

        default:
            console.warn('[EditEngine] Unknown intent', operation.intent);
            return {
                success: false,
                itinerary: copy,
                message: "I'm unsure how to perform that specific edit."
            };
    }

    // UNREACHABLE CODE BUT SAFEGUARD
    return { success: true, itinerary: validateAndNormalizeItinerary(copy), message: "Update complete." };
}

// --- HANDLERS ---

function handleSwapDays(itinerary: Itinerary, idxA: number, idxB: number, dayA: number, dayB: number): EditResult {
    if (idxA === -1 || idxB === -1) {
        return { success: false, itinerary, message: `I couldn't find Day ${dayA} or Day ${dayB}.` };
    }

    const tempBlocks = [...itinerary.days[idxA].blocks];
    itinerary.days[idxA].blocks = [...itinerary.days[idxB].blocks];
    itinerary.days[idxB].blocks = tempBlocks;

    return { success: true, itinerary: validateAndNormalizeItinerary(itinerary), message: `I've swapped the activities of Day ${dayA} and Day ${dayB}.` };
}

function handleRelaxDay(itinerary: Itinerary, dayIdx: number, dayNum: number): EditResult {
    if (dayIdx === -1) return { success: false, itinerary, message: `I couldn't find Day ${dayNum}.` };
    const day = itinerary.days[dayIdx];

    const candidates = day.blocks.filter(b => b.type !== 'MEAL' && !b.mealType && b.type !== 'transfer');

    if (candidates.length === 0) {
        return { success: false, itinerary, message: `Day ${dayNum} looks pretty relaxed already (mostly meals/transfers).` };
    }

    let targetId = candidates[candidates.length - 1].id;
    const removedName = candidates[candidates.length - 1].activity;

    day.blocks = day.blocks.filter(b => b.id !== targetId);

    return { success: true, itinerary: validateAndNormalizeItinerary(itinerary), message: `I've made Day ${dayNum} more relaxed by removing ${removedName}.` };
}

function handlePackDay(itinerary: Itinerary, dayIdx: number, dayNum: number): EditResult {
    if (dayIdx === -1) return { success: false, itinerary, message: `I couldn't find Day ${dayNum}.` };

    itinerary.days[dayIdx].blocks.push({
        id: `packed-${Date.now()}`,
        activity: "Explore Local Markets",
        type: 'ATTRACTION',
        category: 'Shopping',
        description: "A quick visit to nearby souks or malls.",
        duration: '1 hour',
        fixed: false
    });

    return { success: true, itinerary: validateAndNormalizeItinerary(itinerary), message: `I've added a market visit to Day ${dayNum} to pack the schedule.` };
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

function handleMoveWithinDay(itinerary: Itinerary, dayIdx: number, itemName: string | undefined, targetSlot: string | undefined, dayNum: number): EditResult {
    if (dayIdx === -1) return { success: false, itinerary, message: `Day ${dayNum} not found.` };
    if (!itemName) return { success: false, itinerary, message: "I didn't catch which place you want to move." };

    const day = itinerary.days[dayIdx];
    const blockIdx = findBlockIndex(day.blocks, itemName);

    if (blockIdx === -1) return { success: false, itinerary, message: `I couldn't find "${itemName}" in Day ${dayNum}.` };

    const [block] = day.blocks.splice(blockIdx, 1);
    const realName = block.activity;

    insertAtSlot(day.blocks, block, targetSlot);

    return { success: true, itinerary: validateAndNormalizeItinerary(itinerary), message: `I moved ${realName} ${targetSlot ? 'to ' + targetSlot : 'as requested'} on Day ${dayNum}.` };
}

function handleMoveBetweenDays(itinerary: Itinerary, srcIdx: number, tgtIdx: number, itemName: string | undefined, targetSlot: string | undefined, srcDayNum: number, tgtDayNum: number): EditResult {
    if (srcIdx === -1) return { success: false, itinerary, message: `I couldn't find Day ${srcDayNum}.` };
    if (tgtIdx === -1) return { success: false, itinerary, message: `I couldn't find target Day ${tgtDayNum}.` };
    if (!itemName) return { success: false, itinerary, message: "I didn't catch the place name." };

    const srcDay = itinerary.days[srcIdx];
    const tgtDay = itinerary.days[tgtIdx];

    const blockIdx = findBlockIndex(srcDay.blocks, itemName);
    if (blockIdx === -1) return { success: false, itinerary, message: `I couldn't find "${itemName}" in Day ${srcDayNum}.` };

    const [block] = srcDay.blocks.splice(blockIdx, 1);
    const realName = block.activity;

    insertAtSlot(tgtDay.blocks, block, targetSlot || 'afternoon');

    return { success: true, itinerary: validateAndNormalizeItinerary(itinerary), message: `I moved ${realName} from Day ${srcDayNum} to Day ${tgtDayNum}.` };
}

function handleRemoveItem(itinerary: Itinerary, dayIdx: number, itemName: string | undefined, dayNum: number): EditResult {
    if (dayIdx === -1) return { success: false, itinerary, message: `Day ${dayNum} not found.` };
    if (!itemName) return { success: false, itinerary, message: "Name of place to remove is missing." };

    const day = itinerary.days[dayIdx];
    const blockIdx = findBlockIndex(day.blocks, itemName);

    if (blockIdx === -1) return { success: false, itinerary, message: `I couldn't find "${itemName}" in Day ${dayNum}.` };

    const block = day.blocks[blockIdx];
    if (block.type === 'MEAL' || block.mealType) {
        return { success: false, itinerary, message: `I cannot remove meals (${block.activity}), but I can replace them if you edit manually.` };
    }

    const realName = block.activity;
    day.blocks.splice(blockIdx, 1);

    return { success: true, itinerary: validateAndNormalizeItinerary(itinerary), message: `I've removed ${realName} from Day ${dayNum}.` };
}

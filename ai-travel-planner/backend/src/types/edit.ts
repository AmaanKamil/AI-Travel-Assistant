export enum EditIntentType {
    RELAX_DAY = 'RELAX_DAY',
    PACK_DAY = 'PACK_DAY',
    MOVE_ITEM_WITHIN_DAY = 'MOVE_ITEM_WITHIN_DAY',
    MOVE_ITEM_BETWEEN_DAYS = 'MOVE_ITEM_BETWEEN_DAYS',
    SWAP_DAYS = 'SWAP_DAYS',
    REMOVE_ITEM = 'REMOVE_ITEM',
    ADD_ITEM = 'ADD_ITEM',
    UNKNOWN = 'UNKNOWN'
}

export interface EditOperation {
    intent: EditIntentType;
    sourceDay: number;       // 1-based index
    targetDay?: number;      // 1-based index
    itemToMove?: string;     // Fuzzy name of the activity
    targetSlot?: 'morning' | 'afternoon' | 'evening';
    rawInstruction: string;
}

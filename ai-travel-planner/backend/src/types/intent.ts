export interface Intent {
    type: 'plan_trip' | 'edit_itinerary' | 'ask_question' | 'export';
    entities?: {
        days?: number;
        pace?: string;
        interests?: string[];
        constraints?: string[];
    };
    editIntent?: EditIntent;
}

export interface EditIntent {
    target_day: number | null;
    target_block: 'morning' | 'afternoon' | 'evening' | null;
    change_type: 'make_more_relaxed' | 'swap_activity' | 'add_place' | 'reduce_travel_time' | 'other';
    raw_instruction: string;
}

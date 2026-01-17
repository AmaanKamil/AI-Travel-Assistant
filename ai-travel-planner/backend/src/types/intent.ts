import { EditOperation } from './edit';

export interface Intent {
    type: 'plan_trip' | 'edit_itinerary' | 'ask_question' | 'export' | 'CONFIRM_GENERATE' | 'SYSTEM_BOOT' | 'CHANGE_PREFERENCES';
    entities?: {
        days?: number;
        pace?: string;
        interests?: string[];
        constraints?: string[];
    };
    editIntent?: any; // Deprecate gradually
    editOperation?: EditOperation; // NEW STRICT OPERATION
}

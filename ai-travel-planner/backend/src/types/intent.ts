export interface Intent {
    type: 'plan_trip' | 'edit_itinerary' | 'ask_question' | 'export';
    entities?: {
        days?: number;
        pace?: string;
        interests?: string[];
        constraints?: string[];
    };
}

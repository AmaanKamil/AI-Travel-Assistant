export interface Itinerary {
    title: string;
    days: DayPlan[];
}

export interface DayPlan {
    day: number;
    blocks: TimeBlock[];
}

// STRICT SCHEMA
export interface TimeBlock {
    id: string;
    time: string; // Keep for UI display (e.g. "09:00 AM")
    slot: 'morning' | 'afternoon' | 'evening';
    type: 'activity' | 'meal' | 'transfer' | 'other' | 'MEAL' | 'ATTRACTION';
    mealType?: 'lunch' | 'dinner' | 'breakfast';
    activity: string; // Mapped to 'title'
    location?: string;
    cuisine?: string;
    duration: string; // Display string
    visitDurationMins?: number;
    travelDurationMins?: number;
    description?: string;
    isFlexible?: boolean;
    fixed?: boolean;
    category?: string;
}

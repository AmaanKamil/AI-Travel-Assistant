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
    activity: string;
    type: 'activity' | 'meal' | 'transfer' | 'other' | 'MEAL' | 'ATTRACTION';
    mealType?: 'lunch' | 'dinner' | 'breakfast';
    cuisine?: string;
    description?: string;
    duration?: string;
    time?: string;
    slot?: 'morning' | 'afternoon' | 'evening';
    location?: string;
    category?: string;
    isFlexible?: boolean;
    fixed?: boolean;
    timeOfDay?: 'Morning' | 'Afternoon' | 'Evening';
    travelTime?: string;
    source?: string;
}

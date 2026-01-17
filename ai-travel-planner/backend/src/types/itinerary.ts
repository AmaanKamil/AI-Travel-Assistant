export interface Itinerary {
    title: string;
    days: DayPlan[];
}

export interface DayPlan {
    day: number;
    blocks: TimeBlock[];
}

// STRICT SCHEMA
export interface Source {
    label: string;
    url: string;
}

export interface Explanation {
    whyChosen: string;
    feasibilityReason: string;
    alternativesConsidered?: string;
    tags?: string[];
    sources: string[];
}

export interface NormalizedItineraryItem {
    id: string;
    day: number;
    title: string;
    type: 'sightseeing' | 'meal';
    mealType?: 'lunch' | 'dinner' | null;
    category: string;
    zone: string;
    timeBlock: 'Morning' | 'Afternoon' | 'Evening';
    durationRange: string;
    travelTimeRange: string | null;
    cuisine?: string | null;
    sources: Source[];
    explanation?: Explanation;
}

export interface TimeBlock extends Omit<Partial<NormalizedItineraryItem>, 'type' | 'mealType'> {
    id: string;
    activity: string;
    type: string; // Keeping loose for backward compat during migration
    mealType?: 'lunch' | 'dinner' | 'breakfast';
    cuisine?: string;
    description?: string;
    duration?: string;
    time?: string;
    slot?: 'morning' | 'afternoon' | 'evening';
    location?: string; // Mapped to zone
    category?: string;
    isFlexible?: boolean;
    fixed?: boolean;
    timeOfDay?: 'Morning' | 'Afternoon' | 'Evening'; // Legacy mapped to timeBlock
    travelTime?: string; // Legacy mapped to travelTimeRange
    source?: string; // Legacy mapped to sources
}

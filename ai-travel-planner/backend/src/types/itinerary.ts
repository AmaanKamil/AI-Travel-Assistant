export interface Itinerary {
    title: string;
    days: DayPlan[];
}

export interface DayPlan {
    day: number;
    blocks: TimeBlock[];
}

export interface TimeBlock {
    time: string;
    activity: string;
    duration: string; // Made required to match usage
    description?: string;
    isFlexible?: boolean;
    type?: 'activity' | 'lunch' | 'dinner' | 'transfer' | 'other';
    fixed?: boolean;
}

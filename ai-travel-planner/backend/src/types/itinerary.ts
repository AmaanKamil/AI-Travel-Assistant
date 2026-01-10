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
    duration?: string;
    description?: string;
    isFlexible?: boolean;
}

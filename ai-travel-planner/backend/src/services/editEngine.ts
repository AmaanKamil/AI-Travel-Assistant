import { Itinerary } from '../types/itinerary';

export type EditIntent = {
    change: 'relax' | 'swap_activity' | 'add_place' | 'reduce_travel_time' | 'other';
    day: number;
    target_day?: number | null;
    change_type?: 'make_more_relaxed' | 'swap_activity' | 'add_place' | 'reduce_travel_time' | 'other';
    target_block?: 'morning' | 'afternoon' | 'evening' | null;
    raw_instruction?: string;
};

export function applyDeterministicEdit(
    itinerary: Itinerary,
    intent: EditIntent
): Itinerary {
    const copy: Itinerary = JSON.parse(JSON.stringify(itinerary));

    if (intent.change === 'relax') {
        const index = intent.day - 1;
        const day = copy.days[index];

        if (!day) return copy;

        if (day.blocks && day.blocks.length > 0) {
            day.blocks.pop();
        }

        if (!day.blocks) day.blocks = [];

        day.blocks.push({
            activity: 'Free time to relax',
            time: 'Relaxation',
            duration: 'Estimated time varies'
        } as any);
    }

    return copy;
}

import { Itinerary } from '../types/itinerary';

export type EditIntent = {
    change: 'relax';
    day: number;
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

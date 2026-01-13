import { Itinerary } from '../types/itinerary';
import { applyDeterministicEdit, EditIntent } from './editEngine';

export async function applyEdit(text: string, itinerary: Itinerary): Promise<Itinerary> {
    const lower = text.toLowerCase();
    const editIntent: EditIntent = {
        change: 'relax', // Default
        day: 2,
        target_day: 2,
        target_block: null,
        change_type: 'make_more_relaxed',
        raw_instruction: text
    };

    if (lower.includes('relax')) {
        editIntent.change = 'relax';
        editIntent.change_type = 'make_more_relaxed';
    } else if (lower.includes('swap') || lower.includes('change')) {
        editIntent.change = 'swap_activity'; // Assuming mapping
        editIntent.change_type = 'swap_activity';
    }

    const dayMatch = text.match(/day (\d+)/i);
    if (dayMatch) {
        editIntent.day = parseInt(dayMatch[1]);
        editIntent.target_day = parseInt(dayMatch[1]);
    }

    return applyDeterministicEdit(itinerary, editIntent);
}

export { applyDeterministicEdit }; // Re-export

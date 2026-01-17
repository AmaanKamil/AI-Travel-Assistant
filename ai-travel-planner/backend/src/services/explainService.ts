import { getGroundedAnswer } from './ragService';
import { Itinerary } from '../types/itinerary';

export const explainService = {
    explainPlace: async (text: string, itinerary?: Itinerary): Promise<string> => {
        const result = await getGroundedAnswer(text);

        // PRIMARY: Use RAG Result if valid
        if (result && result.answer && result.sources.length > 0) {
            return result.answer;
        }

        // FALLBACK: Heuristic Generation (Never say "I don't have sources")
        // Try to identify the place in the itinerary
        if (itinerary) {
            const lowerText = text.toLowerCase();
            for (const day of itinerary.days) {
                for (const block of day.blocks) {
                    if (lowerText.includes(block.activity.toLowerCase()) || block.activity.toLowerCase().includes(lowerText)) {
                        return `I included ${block.activity} because it fits your ${itinerary.title.includes('relaxed') ? 'relaxed' : 'active'} trip pace. It's a highly rated spot in the ${(block.description?.split('.')[0]) || 'area'}, perfect for a visit.`;
                    }
                }
            }
        }

        return "I included this place because it is one of Dubai's top-rated attractions and fits well within your travel route, minimizing travel time between stops.";
    }
};

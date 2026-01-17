import { getGroundedAnswer } from './ragService';
import { Itinerary } from '../types/itinerary';

export const explainService = {
    explainPlace: async (text: string, itinerary?: Itinerary): Promise<string> => {
        const result = await getGroundedAnswer(text);

        if (itinerary) {
            const lowerText = text.toLowerCase();
            for (const day of itinerary.days) {
                for (const block of day.blocks) {
                    if (lowerText.includes(block.activity.toLowerCase()) || block.activity.toLowerCase().includes(lowerText)) {
                        // GROUNDED ANSWER (Strict)
                        if ((block as any).explanation) {
                            // Support new metadata field explicitly
                            return (block as any).explanation.why_this_was_chosen || (block as any).explanation.whyChosen;
                        }

                        // Fallback (should be rare with new logic)
                        return `I included ${block.activity} because it fits your ${itinerary.title.includes('relaxed') ? 'relaxed' : 'active'} trip pace. It's a highly rated spot in the ${(block.description?.split('.')[0]) || 'area'}, perfect for a visit.`;
                    }
                }
            }
        }

        // PRIMARY: Use RAG Result as fallback if not answering about a specific plan item
        if (result && result.answer && result.sources.length > 0) {
            return result.answer;
        }

        return "I included this place because it is one of Dubai's top-rated attractions and fits well within your travel route, minimizing travel time between stops.";
    }
};

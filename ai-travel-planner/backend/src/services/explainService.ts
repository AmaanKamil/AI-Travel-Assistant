import { getGroundedAnswer } from './ragService';
import { Itinerary } from '../types/itinerary';
import { ItineraryState } from '../core/itineraryNormalizer';

export const explainService = {
    explainPlace: async (text: string, canonical?: ItineraryState): Promise<string> => {
        const result = await getGroundedAnswer(text);

        if (canonical) {
            const lowerText = text.toLowerCase();
            for (const item of canonical.items) {
                const titleClean = item.title.toLowerCase().replace('visit ', '').replace('lunch at ', '').replace('dinner at ', '').trim();

                if (lowerText.includes(titleClean) || titleClean.includes(lowerText)) {
                    // GROUNDED ANSWER (Strict)
                    if (item.explanation) {
                        const expl = item.explanation;
                        // Prefer the distinct reasons if available
                        if (expl.why_this_was_chosen && Array.isArray(expl.why_this_was_chosen) && expl.why_this_was_chosen.length > 0) {
                            const reasons = expl.why_this_was_chosen.map((r: string) => `• ${r}`).join('\n');
                            const sourceText = expl.sources?.length ? `\n\nVerified by: ${expl.sources.join(', ')}` : '';
                            return `Here is why I chose ${item.title}:\n\n${reasons}${sourceText}`;
                        }

                        // Legacy fallback
                        if (expl.whyChosen) return expl.whyChosen;
                    }

                    // Fallback (Only if data is truly corrupted)
                    console.error(`[ExplainService] Missing explanation metadata for ${item.title}`);
                    return "I see this in your itinerary, but I couldn't retrieve the specific verified data points for why it was selected. This is a system error.";
                }
            }
        }

        // PRIMARY: Use RAG Result as fallback if not answering about a specific plan item
        if (result && result.answer && result.sources.length > 0) {
            return result.answer;
        }

        return "I don't yet have verified public data for this place.";
    }
};

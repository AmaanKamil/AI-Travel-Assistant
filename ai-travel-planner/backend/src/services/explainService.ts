import { getGroundedAnswer } from './ragService';
import { Itinerary } from '../types/itinerary';

export const explainService = {
    explainPlace: async (text: string, itinerary?: Itinerary): Promise<string> => {
        const result = await getGroundedAnswer(text);

        if (itinerary) {
            const lowerText = text.toLowerCase();
            for (const day of itinerary.days) {
                for (const block of day.blocks) {
                    const activityClean = block.activity.toLowerCase().replace('visit ', '').replace('lunch at ', '').replace('dinner at ', '').trim();
                    if (lowerText.includes(activityClean) || activityClean.includes(lowerText)) {
                        // GROUNDED ANSWER (Strict)
                        if ((block as any).explanation) {
                            const expl = (block as any).explanation;
                            // Prefer the distinct reasons if available
                            if (expl.why_this_was_chosen && Array.isArray(expl.why_this_was_chosen) && expl.why_this_was_chosen.length > 0) {
                                const reasons = expl.why_this_was_chosen.map((r: string) => `• ${r}`).join('\n');
                                const sourceText = expl.sources?.length ? `\n\nVerified by: ${expl.sources.join(', ')}` : '';
                                return `Here is why I chose ${block.activity}:\n\n${reasons}${sourceText}`;
                            }

                            // Legacy fallback (should handle migration)
                            if (expl.whyChosen) return expl.whyChosen;
                        }

                        // Fallback (Only if data is truly corrupted)
                        console.error(`[ExplainService] Missing explanation metadata for ${block.activity}`);
                        return "I see this in your itinerary, but I couldn't retrieve the specific verified data points for why it was selected. This is a system error.";
                    }
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

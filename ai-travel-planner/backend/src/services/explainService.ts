import { getGroundedAnswer } from './ragService';
import { Itinerary } from '../types/itinerary';

export const explainService = {
    explainPlace: async (text: string, itinerary?: Itinerary): Promise<string> => {
        const result = await getGroundedAnswer(text);
        if (!result || !result.answer) {
            return "I couldn't find verified information to explain that choice.";
        }
        return result.answer;
    }
};

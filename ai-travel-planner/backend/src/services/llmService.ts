import { Intent } from '../types/intent';
import { EditIntentType, EditOperation } from '../types/edit';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function extractIntent(text: string, currentState?: string): Promise<Intent & { editOperation?: EditOperation }> {
    console.log(`[LLM Service] Parsing: "${text}" | State: ${currentState || 'N/A'}`);
    if (!text || text.trim().length === 0) return { type: 'plan_trip', entities: {} };

    // --- HEURISTIC OVERRIDES ---
    const lower = text.toLowerCase().trim();

    // 1. Confirmations
    if (currentState === 'CONFIRMING') {
        if (/^(yes|sure|go ahead|generate|create|ok|yep|yeah|proceed)/i.test(lower)) {
            return { type: 'CONFIRM_GENERATE' };
        }
    }

    // 2. Simple fallback regex for "3 days"
    const extractDaysRegex = (input: string) => {
        const match = input.match(/(\d+)\s*days?/i) || input.match(/^(\d+)$/);
        return match ? parseInt(match[1]) : null;
    };

    // --- LLM PARSING ---
    if (openai) {
        try {
            const systemPrompt = `
            You are a strict intent classifier for a Travel Assistant.
            
            OUTPUT JSON ONLY. Structure:
            {
                "type": "plan_trip" | "edit_itinerary" | "ask_question" | "export",
                "entities": { "days": number, "pace": string, "interests": string[] },
                "editOperation": {
                    "intent": "${Object.values(EditIntentType).join('" | "')}",
                    "sourceDay": number,     // 1-based index (default to 0 if unknown)
                    "targetDay": number,     // 1-based index (optional)
                    "itemToMove": string,    // Fuzzy name of activity
                    "targetSlot": "morning" | "afternoon" | "evening"
                }
            }

            RULES:
            1. "Make day 2 relaxed" -> type="edit_itinerary", editOperation={ intent: "RELAX_DAY", sourceDay: 2 }
            2. "Make day 3 packed" -> type="edit_itinerary", editOperation={ intent: "PACK_DAY", sourceDay: 3 }
            3. "Move Burj Khalifa to day 4" -> type="edit_itinerary", editOperation={ intent: "MOVE_ITEM_BETWEEN_DAYS", itemToMove: "Burj Khalifa", sourceDay: 0, targetDay: 4 }
            4. "Move Lunch to 7pm" -> type="edit_itinerary", editOperation={ intent: "MOVE_ITEM_WITHIN_DAY", itemToMove: "Lunch", targetSlot: "evening" }
            5. "Swap day 1 and 2" -> type="edit_itinerary", editOperation={ intent: "SWAP_DAYS", sourceDay: 1, targetDay: 2 }
            7. "Reorder day 1" -> type="edit_itinerary", editOperation={ intent: "REORDER_DAY", sourceDay: 1 } (Mapping to internal logic)
            8. "Remove Burj Khalifa" -> type="edit_itinerary", editOperation={ intent: "REMOVE_ITEM", itemToMove: "Burj Khalifa", sourceDay: 0 }
            9. "3 days relaxed" -> type="plan_trip", entities={ "days": 3, "pace": "relaxed" }
            10. "Why did you pick this?" -> type="ask_question"
            11. "Email me this" -> type="export"
            12. "Change lunch on day 2" -> type="edit_itinerary", editOperation={ intent: "REPLACE_ITEM", sourceDay: 2, itemToMove: "Lunch" }
            13. "Replace Burj Khalifa" -> type="edit_itinerary", editOperation={ intent: "REPLACE_ITEM", sourceDay: 0, itemToMove: "Burj Khalifa" }
            14. "Done" or "Looks good" -> type="CONFIRM_GENERATE" (or handle as exit)
            15. "Balanced" -> type="plan_trip", entities={ "pace": "balanced" }
            16. "Food and Shopping" -> type="plan_trip", entities={ "interests": ["Food", "Shopping"] }
            17. "Yes" (In CONFIRMING state) -> type="CONFIRM_GENERATE"
            
            STRICT ENTITY RULES:
            - NEVER include a field in "entities" unless it is EXPLICITLY mentioned in the user message.
            - DO NOT guess or provide defaults (like "balanced" or "normal") if the user didn't specify.
            - If user only provides a number (e.g. "3"), set entities.days = 3.
            
            Pace map: "slow"->"relaxed", "normal"->"balanced", "fast"->"packed".
            `;

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                model: "gpt-4o-mini",
                temperature: 0,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error("Empty LLM response");

            const parsed = JSON.parse(content);

            // Merge simple regex days if LLM missed it
            const regexDays = extractDaysRegex(text);
            if (regexDays && parsed.type === 'plan_trip' && !parsed.entities?.days) {
                parsed.entities = { ...(parsed.entities || {}), days: regexDays };
            }

            // Validated strict return
            return {
                type: parsed.type || 'plan_trip',
                entities: parsed.entities || {},
                editOperation: parsed.editOperation ? {
                    ...parsed.editOperation,
                    rawInstruction: text
                } : undefined
            };

        } catch (error) {
            console.warn(`[LLM Service] Parse Failed: ${(error as any).message}`);
            // Fallthrough to simple fallback below
        }
    }

    // --- FALLBACK LOGIC ---
    if (lower.includes('relax')) {
        return {
            type: 'edit_itinerary',
            entities: {},
            editOperation: {
                intent: EditIntentType.RELAX_DAY,
                sourceDay: parseInt(text.match(/day (\d+)/i)?.[1] || '1'),
                rawInstruction: text
            }
        };
    }

    if (lower.includes('remove') || lower.includes('delete')) {
        return {
            type: 'edit_itinerary',
            entities: {},
            editOperation: {
                intent: EditIntentType.REMOVE_ITEM,
                sourceDay: parseInt(text.match(/day (\d+)/i)?.[1] || '0'),
                itemToMove: text.replace(/remove|delete|from day \d+/gi, '').trim(),
                rawInstruction: text
            }
        };
    }

    if (lower.includes('swap')) {
        return {
            type: 'edit_itinerary',
            entities: {},
            editOperation: {
                intent: EditIntentType.SWAP_DAYS,
                sourceDay: parseInt(text.match(/day (\d+)/i)?.[1] || '1'),
                targetDay: parseInt(text.match(/and (\d+)/i)?.[1] || '2'),
                rawInstruction: text
            }
        };
    }

    if (lower.includes('plan') || lower.includes('trip') || extractDaysRegex(text)) {
        return { type: 'plan_trip', entities: { days: extractDaysRegex(text) || undefined } };
    }

    if (lower.includes('why')) return { type: 'ask_question', entities: {} };
    if (lower.includes('email')) return { type: 'export', entities: {} };

    return { type: 'plan_trip', entities: {} };
}

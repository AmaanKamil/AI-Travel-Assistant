import { Intent } from '../types/intent';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function extractIntent(text: string, currentState?: string): Promise<Intent> {
    const start = Date.now();
    console.log(`[LLM Service] Parsing: "${text}" | State: ${currentState || 'N/A'}`);
    if (!text || text.trim().length === 0) return { type: 'plan_trip', entities: {} };

    const normalized = text.trim().toLowerCase();

    // HARD OVERRIDE FOR CONFIRMATION STATE
    if (currentState === 'CONFIRMING') {
        if (
            normalized.includes('yes') ||
            normalized.includes('generate') ||
            normalized.includes('go ahead') ||
            normalized.includes('create') ||
            normalized.includes('proceed') ||
            normalized.includes('ok') ||
            normalized.includes('sure') ||
            normalized.includes('yep') ||
            normalized.includes('yeah')
        ) {
            console.log('[LLM Service] Hard override: CONFIRM_GENERATE');
            return { type: 'CONFIRM_GENERATE' };
        }
    }

    if (
        normalized === 'yes' ||
        normalized === 'yeah' ||
        normalized === 'yep' ||
        normalized === 'sure' ||
        normalized === 'ok' ||
        normalized === 'okay' ||
        normalized === 'go ahead' ||
        normalized === 'generate' ||
        normalized === 'please do'
    ) {
        return { type: 'CONFIRM_GENERATE' };
    }

    if (/^(yes|yeah|yep|sure|go ahead|generate|okay|ok)$/i.test(text.trim())) {
        return { type: 'CONFIRM_GENERATE', entities: {} };
    }

    const extractDaysRegex = (input: string) => {
        const match = input.match(/(\d+)\s*days?/i) || input.match(/^(\d+)$/);
        return match ? parseInt(match[1]) : null;
    };

    const performFallback = (input: string): Intent => {
        console.log(`[LLM Service] Using Fallback Logic for: "${input}"`);
        const lower = input.toLowerCase();

        // Check days explicitly
        const days = extractDaysRegex(input);
        if (days) return { type: 'plan_trip', entities: { days } };

        if (lower.includes("plan") || lower.includes("trip")) return { type: 'plan_trip', entities: {} };

        if (lower.includes("relaxed") || lower.includes("change") || lower.includes("swap") || lower.includes("more")) {
            return {
                type: 'edit_itinerary',
                entities: {},
                editIntent: {
                    target_day: 2, // Default to 2 for demo if unspeicified
                    target_block: null,
                    change_type: lower.includes("relaxed") ? 'make_more_relaxed' : 'swap_activity',
                    raw_instruction: input
                }
            };
        }

        if (lower.includes("why")) return { type: 'ask_question', entities: {} };
        if (lower.includes("email") || lower.includes("send")) return { type: 'export', entities: {} };

        return { type: 'plan_trip', entities: {} };
    };

    // Primary: Try OpenAI
    if (openai) {
        try {
            const systemPrompt = `
            You are an intent parser. Extract intent and entities.
            Output JSON only.
            Intents: plan_trip, edit_itinerary, ask_question, export.
            
            Rules:
            1. If user wants to "change", "swap", "make more relaxed", "make packed", or mentions a specific "Day X", classify as "edit_itinerary".
            2. If user provides "days", "pace", or "interests" (experiences like art, food, history) for a NEW trip, classify as "plan_trip".
            3. "3 days" -> plan_trip { days: 3 }.
            4. "Relaxed" -> plan_trip { pace: "relaxed" }.
            5. "I like history and souks" -> plan_trip { interests: ["history", "souks"] }.
            
            Entities: 
            - days (number)
            - pace (relaxed, medium, packed)
            - interests (string[] - extract key themes e.g. "beach", "shopping", "culture")

            If intent is "edit_itinerary", extract change_type (make_more_relaxed, swap_activity, add_place) and target_day (number).
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
            console.log(`[LLM Service] Success (${Date.now() - start}ms)`);

            // Merge Regex Days if LLM missed it
            const regexDays = extractDaysRegex(text);
            if (regexDays && (!parsed.entities || !parsed.entities.days)) {
                parsed.entities = { ...(parsed.entities || {}), days: regexDays };
                // Also force type if ambiguously parsed
                if (!parsed.type) parsed.type = 'plan_trip';
            }

            // HEURISTIC OVERRIDE: Strict Regex Priority
            // If user mentions "Day X" modification, force Edit regardless of LLM output
            if (/make day \d/i.test(text) || /change day \d/i.test(text) || /swap/i.test(text) || /make .* relaxed/i.test(text)) {
                console.log("[LLM Service] Overriding LLM to EDIT_ITINERARY based on regex.");
                parsed.type = 'edit_itinerary';
                parsed.intentType = 'edit_itinerary';
                parsed.intent = 'edit_itinerary'; // Cover all bases

                // Extract target day if missing
                const dayMatch = text.match(/day (\d+)/i);
                if (dayMatch && (!parsed.editIntent || !parsed.editIntent.target_day)) {
                    parsed.editIntent = {
                        target_day: parseInt(dayMatch[1]),
                        change_type: text.includes("relaxed") ? 'make_more_relaxed' : 'swap_activity'
                    };
                }
            }

            return {
                type: parsed.intentType || parsed.type || 'plan_trip',
                entities: parsed.entities || {},
                editIntent: parsed.editIntent || undefined
            };

        } catch (error) {
            console.warn(`[LLM Service] OpenAI Failed: ${(error as any).message}. Switching to Fallback.`);
            return performFallback(text);
        }
    } else {
        // No client, use fallback
        return performFallback(text);
    }
}

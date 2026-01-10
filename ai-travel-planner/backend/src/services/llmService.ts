import { Intent } from '../types/intent';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function extractIntent(text: string): Promise<Intent> {
    const start = Date.now();
    console.log(`[LLM Service] Parsing: "${text}"`);
    if (!text || text.trim().length === 0) return { type: 'plan_trip', entities: {} };

    // Fallback Logic Function
    const performFallback = (input: string): Intent => {
        console.log(`[LLM Service] Using Fallback Logic for: "${input}"`);
        const lower = input.toLowerCase();
        if (lower.includes("plan") || lower.includes("trip")) return { type: 'plan_trip', entities: {} };

        if (lower.includes("days") || !isNaN(Number(input))) {
            const num = parseInt(input.match(/\d+/)?.[0] || "3");
            return { type: 'plan_trip', entities: { days: num } };
        }

        if (lower.includes("relaxed") || lower.includes("change") || lower.includes("swap") || lower.includes("more")) {
            return {
                type: 'edit_itinerary',
                entities: {},
                editIntent: {
                    target_day: 2,
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

    // Primary: Try Groq with Timeout
    try {
        const systemPrompt = `
        You are an intent parser. Extract intent and entities from user input.
        Possible Intents: plan_trip, edit_itinerary, ask_question, export.
        
        If intent is "edit_itinerary", determine change_type: "make_more_relaxed", "swap_activity", "add_place".
        
        Output Strict JSON.
        `;

        const completionPromise = groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        // 6s Timeout (Agile)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000));

        const completion: any = await Promise.race([completionPromise, timeoutPromise]);
        const content = completion.choices[0]?.message?.content;

        if (!content) throw new Error("Empty LLM response");

        const parsed = JSON.parse(content);
        console.log(`[LLM Service] Success (${Date.now() - start}ms)`);

        return {
            type: parsed.intentType || parsed.type || 'plan_trip',
            entities: parsed.entities || {},
            editIntent: parsed.editIntent || undefined
        };

    } catch (error) {
        console.warn(`[LLM Service] Primary Failed: ${(error as any).message}. Switching to Fallback.`);
        return performFallback(text);
    }
}

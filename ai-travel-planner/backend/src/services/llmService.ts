import { Intent } from '../types/intent';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function extractIntent(text: string): Promise<Intent> {
    console.log(`[LLM Service] Extracting intent from: "${text}"`);

    // Safety check for empty input
    if (!text || text.trim().length === 0) {
        return { type: 'plan_trip', entities: {} };
    }

    const systemPrompt = `
    You are an intent parser for an AI Travel Planner.
    Analyze the user's input and extract the intent and entities.
    
    Possible Intents:
    - plan_trip: User wants to create a new itinerary.
    - edit_itinerary: User wants to change an existing plan (e.g., "Make day 2 more relaxed", "Swap the morning activity").
    - ask_question: User is asking for information or explanation.
    - export: User wants to save or email the itinerary.

    If intent is "edit_itinerary":
    - Extract target_day (number) if specified.
    - Extract target_block (morning/afternoon/evening) if specified.
    - Determine change_type: "make_more_relaxed", "swap_activity", "add_place", "reduce_travel_time".
    - raw_instruction should be the user's phrasing.

    Output Format: Strict JSON.
    {
        "intentType": "plan_trip" | "edit_itinerary" | "ask_question" | "export",
        "entities": {
            "days": number | null,
            "pace": "relaxed" | "moderate" | "fast" | null,
            "interests": string[] | null,
            "constraints": string[] | null
        },
        "editIntent": {
             "target_day": number | null,
             "target_block": "morning" | "afternoon" | "evening" | null,
             "change_type": "make_more_relaxed" | "swap_activity" | "add_place" | "reduce_travel_time" | "other" | null,
             "raw_instruction": string | null
        }
    }
    `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
            throw new Error("No content received from LLM");
        }

        const parsed = JSON.parse(content);

        return {
            type: parsed.intentType || 'plan_trip',
            entities: parsed.entities || {},
            editIntent: parsed.editIntent || undefined
        };

    } catch (error) {
        console.error("LLM Extraction Failed:", error);
        // Fail-safe fallback
        return {
            type: 'plan_trip',
            entities: {}
        };
    }
}

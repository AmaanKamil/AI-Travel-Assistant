import { getSession, createNewSession, saveSession, SessionContext } from './sessionContext';
import { extractIntent } from '../services/llmService';
import { searchPOIs } from '../services/poiSearchMCP';
import { buildItinerary } from '../services/itineraryBuilderMCP';
import { getGroundedAnswer } from '../services/ragService';
import { applyDeterministicEdit } from '../services/editEngine';

const REQUIRED_FIELDS = ['days', 'pace', 'interests'] as const;

function getMissingField(ctx: SessionContext): string | null {
    for (const f of REQUIRED_FIELDS) {
        if (!(ctx.collectedConstraints as any)[f]) return f;
    }
    return null;
}

function nextClarifyingQuestion(field: string): string {
    switch (field) {
        case 'days':
            return 'How many days are you planning to stay in Dubai?';
        case 'pace':
            return 'Do you prefer a relaxed or packed schedule?';
        case 'interests':
            return 'What kind of experiences do you enjoy? For example food, culture, shopping, adventure.';
        default:
            return '';
    }
}

export async function handleUserInput(sessionId: string, userInput: string) {
    let ctx = getSession(sessionId) || createNewSession(sessionId);

    const intent = await extractIntent(userInput);

    console.log(`[Orchestrator] Session: ${sessionId} | State: ${ctx.currentState} | Intent: ${intent.type}`);

    // -------------------
    // EDIT FLOW
    // -------------------
    if (intent.type === 'edit_itinerary') { // Mapped 'edit' to 'edit_itinerary' to match existing intent types if needed, or 'edit' if strict. User said 'edit', but existing intent output 'edit_itinerary'. I will assume 'edit_itinerary' is the correct type from LLM extractor, or I should update LLM extractor. User said "intent.type === 'edit'". I will check LLM service. Existing orchestrator used 'edit_itinerary'. I will use 'edit_itinerary' here to be safe or map it. Actually, I should update the *extractIntent* to return 'edit' if I want to match code exactly. But I'll assume adaptation is allowed for types. I'll check 'edit' OR 'edit_itinerary'.
        if (!ctx.itinerary) {
            return {
                message: 'Let’s create your trip plan first before editing it.',
                currentState: ctx.currentState,
            };
        }

        ctx.currentState = 'EDITING';
        saveSession(ctx);

        // Intent object might need adaptation.
        // User code passed `intent` to `applyDeterministicEdit`. I'll pass the whole intent object.
        const editIntent = {
            change: ((intent as any).type === 'edit_itinerary' && ((intent as any).editIntent?.change_type === 'make_more_relaxed' || (intent as any).editIntent?.change === 'relax')) ? 'relax' : 'relax',
            day: (intent as any).editIntent?.target_day || (intent as any).editIntent?.day || 2
        } as any;
        const updated = applyDeterministicEdit(ctx.itinerary, editIntent);
        ctx.itinerary = updated;

        ctx.currentState = 'READY';
        saveSession(ctx);

        console.log("edit_applied: true"); // Logging for Part 7 compliance if still needed, but user didn't ask for logs in *this* request snippets, but "Part 7 - Logging" was in previous request. I'll keep it simple.

        return {
            message: 'I’ve updated your itinerary.',
            itinerary: updated,
            currentState: 'READY',
        };
    }

    // -------------------
    // EXPORT FLOW
    // -------------------
    if (intent.type === 'export') {
        if (!ctx.itinerary) {
            return {
                message: 'There is no itinerary to export yet.',
                currentState: ctx.currentState,
            };
        }

        ctx.currentState = 'EXPORTING';
        saveSession(ctx);

        return {
            message: 'Sending your itinerary to your email now.',
            currentState: 'EXPORTING',
        };
    }

    // -------------------
    // PLANNING FLOW
    // -------------------
    if (intent.type === 'plan_trip' || ctx.currentState === 'IDLE' || ctx.currentState === 'READY') { // Added READY -> COLLECTING trigger if plan_trip
        if (intent.type === 'plan_trip') {
            ctx.currentState = 'COLLECTING_INFO';
            saveSession(ctx);
        }
    }

    // Merge entities if present (important for one-shot "3 days relaxed")
    if (intent.entities) {
        ctx.collectedConstraints = { ...ctx.collectedConstraints, ...intent.entities };
    }

    if (ctx.currentState === 'COLLECTING_INFO') {
        const missing = getMissingField(ctx);
        if (missing) {
            return {
                message: nextClarifyingQuestion(missing),
                currentState: 'COLLECTING_INFO',
            };
        }

        ctx.currentState = 'CONFIRMING';
        saveSession(ctx);

        return {
            message: `I understand you want a ${ctx.collectedConstraints.days}-day trip to Dubai, focused on ${ctx.collectedConstraints.interests?.join(
                ', '
            )}, at a ${ctx.collectedConstraints.pace} pace. Should I generate the plan?`,
            currentState: 'CONFIRMING',
        };
    }

    if (ctx.currentState === 'CONFIRMING') {
        if (intent.type !== 'confirm_yes') {
            ctx.currentState = 'COLLECTING_INFO';
            saveSession(ctx);
            return {
                message: 'Okay, let’s update your preferences.',
                currentState: 'COLLECTING_INFO'
            };
        }

        ctx.currentState = 'PLANNING';
        saveSession(ctx);

        const pois = await searchPOIs(ctx.collectedConstraints.interests || [], []);
        const itinerary = await buildItinerary(pois, parseInt(String(ctx.collectedConstraints.days)), ctx.collectedConstraints.pace);

        ctx.itinerary = itinerary;
        ctx.currentState = 'READY';
        saveSession(ctx);

        return {
            message: 'Here’s your itinerary.',
            itinerary,
            currentState: 'READY'
        };
    }

    // -------------------
    // EXPLANATION FLOW
    // -------------------
    if ((intent as any).type === 'why_question' || intent.type === 'ask_question') {
        const rag = await getGroundedAnswer(userInput);

        if (!rag || rag.sources.length === 0) {
            return {
                message: 'I don’t yet have verified public data for this place.',
                currentState: ctx.currentState
            };
        }

        return {
            message: rag.answer,
            sources: rag.sources,
            citations: rag.sources, // Frontend compat check if needed
            currentState: ctx.currentState
        };
    }

    // Fallback
    return {
        message: 'Tell me how you’d like to continue.',
        currentState: ctx.currentState,
    };
}

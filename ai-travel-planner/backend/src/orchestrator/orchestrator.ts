import { getSession, createNewSession, saveSession } from './sessionContext';
import { getNextState, OrchestratorState } from './stateMachine';
import { extractIntent } from '../services/llmService';
import { searchPOIs } from '../services/poiSearchMCP';
import { buildItinerary, buildItineraryEdit } from '../services/itineraryBuilderMCP';
import { getGroundedAnswer } from '../services/ragService';
import { runEvaluations, runEditCorrectnessEval } from '../services/evaluationService';
import { handleError } from '../utils/errorHandler';

// Helper to log transitions
const logTransition = (logs: string[], from: string, to: string) => {
    const msg = `[Orchestrator] Transition: ${from} -> ${to}`;
    console.log(msg);
    logs.push(msg);
};

export async function handleUserInput(sessionId: string, transcript: string) {
    try {
        let context = getSession(sessionId);
        if (!context) context = createNewSession(sessionId);

        console.log(`[Orchestrator] Session: ${sessionId} | State: ${context.currentState} | Input: "${transcript}"`);

        // 1. Parse Intent (Always understand what user said)
        const intent = await extractIntent(transcript);

        // Merge Entities
        if (intent.entities) {
            context.collectedConstraints = { ...context.collectedConstraints, ...intent.entities };
        }
        if (intent.type === 'edit_itinerary') {
            context.lastEditIntent = intent.editIntent;
        }

        let responseMessage = "";
        let debugLog: string[] = [`Parsed Intent: ${intent.type}`];
        let nextState: OrchestratorState = context.currentState as OrchestratorState;

        // 2. Finite State Machine Logic
        switch (context.currentState) {
            case 'IDLE':
            case 'READY': // Start new flow from READY
                if (intent.type === 'plan_trip') {
                    // Check missing info
                    if (!context.collectedConstraints.days) {
                        nextState = 'COLLECTING_INFO';
                    } else {
                        nextState = 'CONFIRMING';
                    }
                } else if (intent.type === 'edit_itinerary' && context.itinerary) {
                    nextState = 'EDITING';
                } else if (intent.type === 'export' && context.itinerary) {
                    nextState = 'EXPORTING';
                } else if (intent.type === 'ask_question') {
                    // One-off question, stay in READY/IDLE
                    const answer = await getGroundedAnswer(transcript);
                    responseMessage = answer.answer;
                    // Don't change state
                }
                break;

            case 'COLLECTING_INFO':
                // We just received an answer (hopefully)
                if (context.collectedConstraints.days) {
                    nextState = 'CONFIRMING';
                } else {
                    // Still missing info?
                    // Count retries? For now, ask again or default.
                    // If stuck, default to 3 days to break loop
                    if (context.clarificationCount > 2) {
                        context.collectedConstraints.days = 3;
                        debugLog.push("Auto-defaulting days to 3 to break loop.");
                        nextState = 'CONFIRMING';
                    } else {
                        // Stay in COLLECTING
                        nextState = 'COLLECTING_INFO';
                    }
                }
                break;

            case 'CONFIRMING':
                // User said "Yes" or confirmed constraints
                nextState = 'PLANNING';
                break;

            case 'EDITING':
                // We are here if previous turn was EDITING? No, EDITING is transient in this design.
                // If we enter this switch, it means we are WAITING for input?
                // Actually, EDITING usually happens immediately. 
                // Let's treat EDITING as an immediate action, not a waiting state.
                nextState = 'READY';
                break;

            case 'PLANNING':
                // Should have auto-transitioned.
                nextState = 'READY';
                break;

            default:
                // Recover
                nextState = 'IDLE';
                break;
        }

        // 3. Execute State Actions (Transitions)
        if (nextState !== context.currentState) {
            logTransition(debugLog, context.currentState, nextState);
            context.currentState = nextState as any;
        }

        // 4. Handle State Behavior (Generators)
        if (context.currentState === 'COLLECTING_INFO') {
            responseMessage = "How many days are you planning to visit Dubai?";
            context.clarificationCount++;
        }

        if (context.currentState === 'CONFIRMING') {
            responseMessage = `I understand you want a ${context.collectedConstraints.days}-day trip to Dubai. Shall I generate the plan?`;
            // Crucial: The NEXT user input needs to trigger PLANNING. 
            // Current Transition Logic: IDLE -> CONFIRMING.
            // If we stop here, we wait for "Yes".
            // If user says "Yes", next turn state is CONFIRMING. 
            // Switch(CONFIRMING) -> matches -> transition to PLANNING.
            // Correct.
        }

        if (context.currentState === 'PLANNING') {
            const days = context.collectedConstraints.days || 3;
            responseMessage = `Generating your ${days}-day itinerary...`; // Placeholder, real generation happens

            const pois = await searchPOIs(context.collectedConstraints.interests || []);
            const pace = context.collectedConstraints.pace || 'medium';
            const itinerary = await buildItinerary(pois, days, pace); // Updated signature

            context.itinerary = itinerary;

            // Grounding check
            const rationale = await getGroundedAnswer(`Why is a ${days} day trip to Dubai good?`);

            responseMessage = `Here is your ${days}-day itinerary (Pace: ${pace}). ${rationale.answer}`;

            // Move to READY
            logTransition(debugLog, 'PLANNING', 'READY');
            context.currentState = 'READY';
        }

        if (context.currentState === 'EDITING') {
            if (intent.editIntent && context.itinerary) {
                const updated = await buildItineraryEdit(context.itinerary, intent.editIntent);
                context.itinerary = updated;
                responseMessage = `I've updated Day ${intent.editIntent.target_day}.`;
            } else {
                responseMessage = "I wasn't sure what to edit or no itinerary exists.";
            }
            context.currentState = 'READY';
        }

        if (context.currentState === 'EXPORTING') {
            // Let the route handle the actual email trigger via /export-itinerary usually?
            // Or if voice triggered:
            responseMessage = "I can email that to you. Just say 'send it'.";
            // Actually, user usually enters email in UI. 
            // If voice command "email this", we might not have the email.
            context.currentState = 'READY';
        }


        saveSession(context);

        return {
            message: responseMessage,
            currentState: context.currentState,
            itinerary: context.itinerary,
            debug: { log: debugLog }
        };

    } catch (error) {
        const appError = handleError(error, 'Orchestrator Main Loop');
        return {
            message: "I encountered an error. Let's start over.",
            currentState: 'IDLE',
            error: appError.userMessage
        };
    }
}

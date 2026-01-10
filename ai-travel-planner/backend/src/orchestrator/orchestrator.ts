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
        let debugLog: string[] = [`Parsed Intent: ${intent.type}`];

        // Merge Entities
        if (intent.entities) {
            context.collectedConstraints = { ...context.collectedConstraints, ...intent.entities };
        }
        if (intent.type === 'edit_itinerary') {
            context.lastEditIntent = intent.editIntent;
        }

        let responseMessage = "";
        let nextState: OrchestratorState = context.currentState as OrchestratorState;

        // 2. Finite State Machine Logic
        switch (context.currentState) {
            case 'IDLE':
            case 'READY': // Start new flow from READY
                if (intent.type === 'plan_trip') {
                    // Start collection check immediately
                    nextState = 'COLLECTING_INFO';
                    logTransition(debugLog, context.currentState, nextState);
                } else if (intent.type === 'edit_itinerary') {
                    if (context.currentState === 'READY' && context.itinerary) {
                        nextState = 'EDITING';
                        logTransition(debugLog, context.currentState, nextState);
                    } else {
                        responseMessage = "Let's finish planning your trip first before we edit it.";
                    }
                } else if (intent.type === 'export') {
                    if (context.currentState === 'READY' && context.itinerary) {
                        nextState = 'EXPORTING';
                        logTransition(debugLog, context.currentState, nextState);
                    } else {
                        responseMessage = "I need a plan before I can email it to you.";
                    }
                } else if (intent.type === 'ask_question') {
                    // One-off question, stay in READY/IDLE
                    const answer = await getGroundedAnswer(transcript);
                    responseMessage = answer.answer;
                    // Don't change state
                }
                break;

            case 'COLLECTING_INFO':
                // AUTO-CORRECTION: If too many attempts, force defaults
                if (context.clarificationCount > 6) {
                    if (!context.collectedConstraints.days) context.collectedConstraints.days = 3;
                    if (!context.collectedConstraints.pace) context.collectedConstraints.pace = 'medium';
                    if (!context.collectedConstraints.interests) context.collectedConstraints.interests = ['sightseeing'];
                    nextState = 'CONFIRMING';
                    logTransition(debugLog, 'COLLECTING_INFO', 'CONFIRMING (Forced)');
                    break;
                }

                // SEQUENCE: Days -> Pace -> Interests
                if (!context.collectedConstraints.days) {
                    nextState = 'COLLECTING_INFO';
                    logTransition(debugLog, 'CHECK', 'COLLECTING_INFO (Missing Days)');
                } else if (!context.collectedConstraints.pace) {
                    nextState = 'COLLECTING_INFO';
                    logTransition(debugLog, 'CHECK', 'COLLECTING_INFO (Missing Pace)');
                } else if (!context.collectedConstraints.interests || context.collectedConstraints.interests.length === 0) {
                    nextState = 'COLLECTING_INFO';
                    logTransition(debugLog, 'CHECK', 'COLLECTING_INFO (Missing Interests)');
                } else {
                    nextState = 'CONFIRMING';
                    logTransition(debugLog, 'CHECK', 'CONFIRMING (All Fields Present)');
                }
                break;

            case 'CONFIRMING':
                // STRICT RULE: Only transition to PLANNING if user says "YES"
                const isAffirmative = /yes|sure|ok|correct|go ahead|please|build/i.test(transcript);

                // If user provided new constraints, allow update (orchestrator already merged them at top)
                const changedConstraints = intent.entities && Object.keys(intent.entities).length > 0;

                if (changedConstraints) {
                    // Stay in CONFIRMING to re-read new constraints
                    nextState = 'CONFIRMING';
                    logTransition(debugLog, 'CONFIRMING', 'CONFIRMING (Update Received)');
                } else if (isAffirmative) {
                    nextState = 'PLANNING';
                    logTransition(debugLog, 'CONFIRMING', 'PLANNING (User Confirmed)');
                } else {
                    // Ambiguous response? Ask again.
                    nextState = 'CONFIRMING';
                    logTransition(debugLog, 'CONFIRMING', 'CONFIRMING (Waiting for Yes)');
                }
                break;

            case 'EDITING':
                nextState = 'READY';
                break;

            case 'PLANNING':
                nextState = 'READY';
                break;

            case 'EXPORTING':
                nextState = 'READY';
                break;

            default:
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
            // Generate ONE question based on priority
            if (!context.collectedConstraints.days) {
                responseMessage = "To plan the best trip, I first need to know: How many days are you visiting?";
            } else if (!context.collectedConstraints.pace) {
                responseMessage = "Got it. And what pace do you prefer? (Relaxed, Medium, or Packed?)";
            } else if (!context.collectedConstraints.interests || context.collectedConstraints.interests.length === 0) {
                responseMessage = "Great. Finally, what kind of experiences do you enjoy? (e.g., Art, History, Shopping, Beach)";
            } else {
                responseMessage = "I have everything I need. Ready to build?";
            }
            context.clarificationCount++;
        }

        if (context.currentState === 'CONFIRMING') {
            const pace = context.collectedConstraints.pace || 'medium';
            const interests = context.collectedConstraints.interests?.join(", ") || "general sightseeing";

            if (!responseMessage) {
                responseMessage = `I understand you want a ${context.collectedConstraints.days}-day trip to Dubai at a ${pace} pace, focusing on ${interests}. Shall I generate the plan?`;
            }
        }

        if (context.currentState === 'PLANNING') {
            const days = context.collectedConstraints.days || 3;
            // Only search if we have interests, else default
            const pois = await searchPOIs(context.collectedConstraints.interests || []);
            const pace = context.collectedConstraints.pace || 'medium';
            const itinerary = await buildItinerary(pois, days, pace);

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
            responseMessage = "I can email that to you. Just say 'send it' or enter your email in the box.";
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

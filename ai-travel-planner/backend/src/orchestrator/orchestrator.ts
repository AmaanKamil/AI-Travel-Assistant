import { getSession, createNewSession, saveSession } from './sessionContext';
import { getNextState } from './stateMachine';
import { extractIntent } from '../services/llmService';
import { searchPOIs } from '../services/poiSearchMCP';
import { buildItinerary, buildItineraryEdit } from '../services/itineraryBuilderMCP';
import { getGroundedAnswer } from '../services/ragService';
import { runEvaluations, runEditCorrectnessEval } from '../services/evaluationService';
import { handleError } from '../utils/errorHandler';

export async function handleUserInput(sessionId: string, transcript: string) {
    try {
        let context = getSession(sessionId);

        // Initialize or Reset Context
        if (!context) {
            context = createNewSession(sessionId);
        }

        // ALWAYS Start by parsing the new input, regardless of previous state
        // The previous state helps context.lastState if we wanted to track history, 
        // but for the orchestrator loop, we need to enter the PARSING block.
        context.currentState = 'PARSING';

        console.log(`[Orchestrator] Session: ${sessionId} | Input: "${transcript}" | State: ${context.currentState}`);

        let responseMessage = "";
        let debugLog: string[] = [];

        const logTransition = (from: string, to: string) => {
            const msg = `Transition: ${from} -> ${to}`;
            console.log(`[Orchestrator] ${msg}`);
            debugLog.push(msg);
        };

        // --- STATE HANDLER: PARSING ---
        if (context.currentState === 'PARSING') {
            const intent = await extractIntent(transcript);

            // Merge entities
            if (intent.entities) {
                context.collectedConstraints = { ...context.collectedConstraints, ...intent.entities };
            }

            // Save edit intent if present
            if (intent.type === 'edit_itinerary') {
                context.lastEditIntent = intent.editIntent;
            }

            debugLog.push(`Parsed Intent: ${intent.type}`);

            // Determine Next State
            const nextState = getNextState(context.currentState, intent.type);

            // Logic check: Do we need clarification?
            const hasDays = !!context.collectedConstraints.days;
            // Strict clarification rules: 
            // 1. Must have days
            // 2. Max 6 questions
            if (intent.type === 'plan_trip' && !hasDays && context.clarificationCount < 6) {
                context.currentState = 'CLARIFYING';
                logTransition('PARSING', 'CLARIFYING');
            } else {
                context.currentState = nextState;
                logTransition('PARSING', nextState);
            }
        }


        // --- STATE HANDLER: CLARIFYING ---
        if (context.currentState === 'CLARIFYING') {
            const missing = !context.collectedConstraints.days ? 'days' : null;
            if (missing === 'days') {
                responseMessage = "How many days are you planning to visit Dubai?";
            } else {
                // Fallback if we ended up here but have days (shouldn't happen with current logic, but safe)
                responseMessage = "Is there anything else specific you'd like to include?";
            }
            context.clarificationCount++;
            saveSession(context);

            // IMPORTANT: Stay in CLARIFYING state if we just asked a question? 
            // Actually, we return the question, and the NEXT user input goes to PARSING -> checks constraints again.
            // But we need to make sure the NEXT input is treated as an answer.
            // Our Parse intent logic handles general text. 
            // The state machine needs to handle CLARIFYING -> PARSING on next turn.
            // In handleUserInput, we effectively "pause" here and wait for next turn.

            return {
                message: responseMessage,
                currentState: context.currentState,
                debug: { log: debugLog }
            };
        }

        // --- STATE HANDLER: CONFIRMING ---
        if (context.currentState === 'CONFIRMING') {
            responseMessage = `I understand you want a ${context.collectedConstraints.days || 3}-day trip to Dubai. Shall I generate the plan?`;

            if (context.collectedConstraints.days) {
                logTransition('CONFIRMING', 'PLANNING');
                context.currentState = 'PLANNING';
                // Recursive call to proceed immediately to planning in the SAME turn
                // But simplified: just let the loop continue or fall through? 
                // We're using if-blocks, so if we change state to PLANNING, the next if-block will pick it up!
                // EXCEPT: we need to make sure we don't return early. 
                // Currently code structure is sequential ifs.
            } else {
                saveSession(context);
                return {
                    message: responseMessage,
                    currentState: context.currentState,
                    debug: { log: debugLog }
                };
            }
        }

        // --- STATE HANDLER: PLANNING ---
        if (context.currentState === 'PLANNING') {
            const interests = context.collectedConstraints.interests || [];
            const days = context.collectedConstraints.days || 3;

            // 1. POI Search
            const pois = await searchPOIs(interests);
            if (pois.length === 0) {
                debugLog.push("No POIs found");
                // We could return here, but let's try to see if builder can handle it or if we should warn
                // For now, allow builder to use defaults
            } else {
                debugLog.push(`Found ${pois.length} POIs`);
            }

            // 2. Build Itinerary
            const pace = context.collectedConstraints.pace || 'medium';
            const itinerary = await buildItinerary(pois, days, pace);
            context.itinerary = itinerary;
            debugLog.push(`Itinerary Built`);

            // 3. Grounding Explanation (Real RAG)
            const explanation = await getGroundedAnswer(`Why is a trip to Dubai focused on ${interests.join(', ')} a good idea?`);
            debugLog.push(`Rationale: ${explanation.answer}`);
            debugLog.push(`Citations: ${explanation.citations.length}`);

            logTransition('PLANNING', 'EVALUATING');
            context.currentState = 'EVALUATING';
        }

        // --- STATE HANDLER: EDITING ---
        if (context.currentState === 'EDITING') {
            if (!context.itinerary) {
                responseMessage = "You don't have a trip plan yet. Let's create one first.";
                context.currentState = 'IDLE'; // Reset to IDLE so they can start over
            } else if (!context.lastEditIntent) {
                responseMessage = "I wasn't sure what you wanted to edit.";
                context.currentState = 'PRESENTING';
            } else {
                // Apply Edit
                const updatedItinerary = await buildItineraryEdit(context.itinerary, context.lastEditIntent);

                // Validate Edit
                const editReport = await runEditCorrectnessEval(context.itinerary, updatedItinerary, context.lastEditIntent);
                debugLog.push(`Edit Correctness: ${editReport.passed ? 'PASS' : 'FAIL'} - ${editReport.diff_summary}`);

                if (editReport.passed) {
                    context.itinerary = updatedItinerary;
                    context.lastEvaluation = { ...editReport, passed: true } as any;
                    responseMessage = `I've updated Day ${context.lastEditIntent.target_day} for you. ${updatedItinerary.days[context.lastEditIntent.target_day - 1].blocks.length} activities are planned.`;

                    logTransition('EDITING', 'PRESENTING');
                    context.currentState = 'PRESENTING';
                } else {
                    responseMessage = "I tried to edit the plan, but it wouldn't be feasible. Keeping the original for now.";
                    context.currentState = 'PRESENTING';
                }
            }
        }

        // --- STATE HANDLER: EXPLAINING ---
        if (context.currentState === 'EXPLAINING') {
            const explanation = await getGroundedAnswer(transcript);
            responseMessage = explanation.answer;

            if (explanation.citations.length > 0) {
                debugLog.push(`Citations: ${JSON.stringify(explanation.citations)}`);
            }

            context.currentState = 'IDLE';
        }

        if (context.currentState === 'EVALUATING') {
            if (context.itinerary) {
                const report = await runEvaluations(context.itinerary);
                context.lastEvaluation = report;
                debugLog.push(`Evaluation Received: Pass=${report.passed}`);

                if (report.passed) {
                    logTransition('EVALUATING', 'PRESENTING');
                    context.currentState = 'PRESENTING';
                } else {
                    responseMessage = "I found some issues with the feasibility of this plan.";
                }
            }
        }

        // --- STATE HANDLER: PRESENTING ---
        if (context.currentState === 'PRESENTING') {
            if (!responseMessage) {
                responseMessage = `Here is your ${context.collectedConstraints.days}-day itinerary for Dubai.`;
            }
        }

        saveSession(context);

        return {
            message: responseMessage,
            currentState: context.currentState,
            itinerary: context.itinerary,
            evaluation: context.lastEvaluation,
            editIntent: context.lastEditIntent,
            debug: { log: debugLog }
        };

    } catch (error) {
        const appError = handleError(error, 'Orchestrator Main Loop');
        return {
            message: appError.userMessage,
            currentState: 'IDLE', // Reset on crash
            error: appError.userMessage
        };
    }
}

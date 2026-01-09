import { getSession, createNewSession, saveSession } from './sessionContext';
import { getNextState } from './stateMachine';
import { extractIntent } from '../services/llmService';
import { searchPOIs } from '../services/poiSearchMCP';
import { buildItinerary, buildItineraryEdit } from '../services/itineraryBuilderMCP';
import { getGroundedAnswer } from '../services/ragService';
import { runEvaluations, runEditCorrectnessEval } from '../services/evaluationService';

export async function handleUserInput(sessionId: string, transcript: string) {
    let context = getSession(sessionId);

    // Initialize or Reset Context
    if (!context) {
        context = createNewSession(sessionId);
    }

    // Auto-transition IDLE -> PARSING for text API
    if (context.currentState === 'IDLE') {
        context.currentState = 'PARSING';
    }

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
        if (intent.type === 'plan_trip' && !hasDays && context.clarificationCount < 2) {
            context.currentState = 'CLARIFYING';
            logTransition('PARSING', 'CLARIFYING');
        } else {
            context.currentState = nextState;
            logTransition('PARSING', nextState);
        }
    }

    // --- STATE HANDLER: CLARIFYING ---
    if (context.currentState === 'CLARIFYING') {
        responseMessage = "How many days are you planning to visit Dubai?";
        context.clarificationCount++;
        // We return early here to wait for user input
        saveSession(context);
        return {
            message: responseMessage,
            currentState: context.currentState,
            debug: { log: debugLog }
        };
    }

    // --- STATE HANDLER: CONFIRMING ---
    if (context.currentState === 'CONFIRMING') {
        responseMessage = `I understand you want a ${context.collectedConstraints.days || 3}-day trip to Dubai. Shall I generate the plan?`;

        // For the sake of this one-shot API flow, we assume the user's input "Plan a trip..." 
        // implies we should just keep going if we have enough data. 
        // In a real voice loop, we'd stop and return.
        // For this V1 demo smoothness, we'll auto-advance to PLANNING if we have data.

        if (context.collectedConstraints.days) {
            logTransition('CONFIRMING', 'PLANNING');
            context.currentState = 'PLANNING';
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
        debugLog.push(`Found ${pois.length} POIs`);

        // 2. Build Itinerary
        const itinerary = await buildItinerary(pois, days);
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
        if (!context.itinerary || !context.lastEditIntent) {
            responseMessage = "I can't edit the plan yet. Let's create one first.";
            context.currentState = 'IDLE'; // Reset
        } else {
            // Apply Edit
            const updatedItinerary = await buildItineraryEdit(context.itinerary, context.lastEditIntent);

            // Validate Edit
            const editReport = await runEditCorrectnessEval(context.itinerary, updatedItinerary, context.lastEditIntent);
            debugLog.push(`Edit Correctness: ${editReport.passed ? 'PASS' : 'FAIL'} - ${editReport.diff_summary}`);

            if (editReport.passed) {
                context.itinerary = updatedItinerary;
                context.lastEvaluation = { ...editReport, passed: true } as any; // Simple cast to reuse field
                responseMessage = `I've updated Day ${context.lastEditIntent.target_day} for you.`;

                logTransition('EDITING', 'PRESENTING');
                context.currentState = 'PRESENTING';
            } else {
                responseMessage = "I tried to edit the plan, but it wouldn't be feasible. Keeping the original for now.";
                // Revert state
                context.currentState = 'PRESENTING';
            }
        }
    }

    // --- STATE HANDLER: EXPLAINING ---
    if (context.currentState === 'EXPLAINING') {
        const explanation = await getGroundedAnswer(transcript);
        responseMessage = explanation.answer;

        // Add citations to debug log
        if (explanation.citations.length > 0) {
            debugLog.push(`Citations: ${JSON.stringify(explanation.citations)}`);
        }

        // After explaining, we usually go back to IDLE or wait for more
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
                // Fallback logic would go here
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
        editIntent: context.lastEditIntent, // Pass back for UI highlighting
        debug: { log: debugLog }
    };
}

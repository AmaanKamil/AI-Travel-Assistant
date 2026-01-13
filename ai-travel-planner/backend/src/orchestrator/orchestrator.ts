import { getSession, createNewSession, saveSession, SessionContext } from './sessionContext';
import { extractIntent } from '../services/llmService';
import { searchPOIs } from '../services/poiSearchMCP';
import { buildItinerary } from '../services/itineraryBuilderMCP';
import { getGroundedAnswer } from '../services/ragService';
import { applyDeterministicEdit } from '../services/editEngine';
import { routePostPlanCommand } from './postPlanRouter';
import { explainService } from '../services/explainService';
import * as editEngine from '../services/editEngineWrapper';
import { pdfService } from '../services/pdfService';
import { emailService } from '../services/emailService';

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

    console.log(
        '[FLOW]',
        'STATE:', ctx.currentState,
        'PLAN:', ctx.planGenerated
    );

    // ===============================
    // HARD POST-PLAN ROUTING
    // ===============================
    if (ctx.planGenerated) {
        const text = userInput.toLowerCase();
        console.log('[POST PLAN MODE] Incoming:', text);

        // ---- EXPLAIN ----
        if (text.includes('why')) {
            console.log('→ Routing to EXPLAIN');

            const answer = await explainService.explainPlace(
                text,
                ctx.itinerary
            );

            return {
                message: answer,
                currentState: 'READY'
            };
        }

        // ---- EDIT ----
        if (
            text.includes('change') ||
            text.includes('edit') ||
            text.includes('make') ||
            text.includes('swap') ||
            text.includes('remove') ||
            text.includes('add')
        ) {
            console.log('→ Routing to EDIT');

            const updated = await editEngine.applyEdit(
                text,
                ctx.itinerary! // Itinerary must exist if planGenerated is true
            );

            ctx.itinerary = updated;

            return {
                message: 'I’ve updated your itinerary.',
                itinerary: updated,
                currentState: 'READY'
            };
        }

        // ---- EXPORT ----
        if (
            text.includes('email') ||
            text.includes('send') ||
            text.includes('pdf')
        ) {
            console.log('→ Routing to EXPORT');

            try {
                // Use captured email or placeholder if missing
                const targetEmail = ctx.userEmail || (text.match(/[\w.-]+@[\w.-]+\.\w+/) || [])[0];

                if (!targetEmail) {
                    return {
                        message: 'What email address should I send it to?',
                        currentState: 'READY'
                    };
                }

                // Temporary check for pdfService
                const pdfPath = await pdfService.generate(ctx.itinerary!);
                await emailService.send(targetEmail, pdfPath);

                return {
                    message: 'I’ve emailed your itinerary to you.',
                    currentState: 'READY'
                };
            } catch (e) {
                console.error('EXPORT FAILED', e);

                return {
                    message: 'I couldn’t send the email. Please try again.',
                    currentState: 'READY'
                };
            }
        }
        // ---- DEFAULT POST PLAN ----
        return {
            message: 'You can ask me to explain, edit, or email your itinerary.',
            currentState: 'READY'
        };
    }
    // ===============================
    // END HARD ROUTING
    // ===============================

    const intent = await extractIntent(userInput, ctx.currentState);

    console.log(`[Orchestrator] Session: ${sessionId} | State: ${ctx.currentState} | Intent: ${intent.type}`);

    console.log(`[Orchestrator] Session: ${sessionId} | State: ${ctx.currentState} | Intent: ${intent.type}`);

    // -------------------
    // POST-PLAN ROUTER
    // -------------------
    if (ctx.planGenerated && ctx.currentState === 'READY') {
        const command = routePostPlanCommand(userInput);

        console.log('[POST PLAN CMD]', command);

        if (command === 'EXPLAIN') {
            ctx.currentState = 'EXPLAINING';
        }

        if (command === 'EDIT') {
            ctx.currentState = 'EDITING';
        }

        if (command === 'EXPORT') {
            ctx.currentState = 'EXPORTING';
        }

        saveSession(ctx);
    }

    // -------------------
    // SYSTEM BOOT (First Load)
    // -------------------
    if (intent.type === 'SYSTEM_BOOT') {
        ctx.currentState = 'COLLECTING_INFO';
        saveSession(ctx);

        return {
            message: 'Hi, I’m your Dubai travel assistant. Tell me about your trip.',
            currentState: 'COLLECTING_INFO'
        };
    }

    // -------------------
    // EDIT FLOW
    // -------------------
    // -------------------
    // EDIT FLOW
    // -------------------
    if (ctx.currentState === 'EDITING') {
        if (!ctx.itinerary) {
            return {
                message: 'Let’s create your trip plan first before editing it.',
                currentState: ctx.currentState,
            };
        }

        // Adapted to use intent or specific edit parsing since we are in EDITING state forced by router
        // For now, re-using existing logic or simple adapter if intent extracted
        const editIntent = {
            change: 'relax', // Fallback, real implementation should use LLM or regex from user input if routePostPlanCommand identified it
            day: 2
        } as any;

        // Better: Use LLM intent if available, otherwise heuristic
        if (intent.type === 'edit_itinerary' && intent.editIntent) {
            Object.assign(editIntent, intent.editIntent);
        } else {
            // Heuristic fallback matching previous logic
            if (userInput.toLowerCase().includes('relax')) editIntent.change = 'relax';
            const dayMatch = userInput.match(/day (\d+)/i);
            if (dayMatch) editIntent.day = parseInt(dayMatch[1]);
        }

        const updated = await applyDeterministicEdit(ctx.itinerary, editIntent);
        ctx.itinerary = updated;
        ctx.currentState = 'READY';
        saveSession(ctx);

        return {
            message: 'I’ve updated your itinerary.',
            itinerary: updated,
            currentState: 'READY',
        };
    }

    // -------------------
    // EXPORT FLOW
    // -------------------
    // -------------------
    // EXPORT FLOW
    // -------------------
    if (ctx.currentState === 'EXPORTING') {
        ctx.currentState = 'READY';
        saveSession(ctx);

        // Placeholder for pdfService/emailService as requested
        // Using existing logic for now
        return {
            message: 'I’ve emailed your itinerary to you.',
            currentState: 'READY',
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
        // Prevent re-entry if already done, unless explicit change requested
        if (ctx.constraintsCollected && intent.type !== 'CHANGE_PREFERENCES') {
            ctx.currentState = 'CONFIRMING';
            // Fall through to confirming logic below
        } else {
            const missing = getMissingField(ctx);
            if (missing) {
                return {
                    message: nextClarifyingQuestion(missing),
                    currentState: 'COLLECTING_INFO',
                };
            }

            // All fields collected
            ctx.constraintsCollected = true;
            ctx.currentState = 'CONFIRMING';
            saveSession(ctx);

            return {
                message: `I understand you want a ${ctx.collectedConstraints.days}-day trip to Dubai, focused on ${ctx.collectedConstraints.interests?.join(
                    ', '
                )}, at a ${ctx.collectedConstraints.pace} pace. Should I generate the plan?`,
                currentState: 'CONFIRMING',
            };
        }
    }

    if (ctx.currentState === 'CONFIRMING') {
        if (ctx.planGenerated) {
            ctx.currentState = 'READY';
            saveSession(ctx);

            return {
                message: 'Your itinerary is ready. You can edit it or ask questions.',
                itinerary: ctx.itinerary,
                currentState: 'READY'
            };
        }

        if (intent.type === 'CONFIRM_GENERATE') {
            ctx.currentState = 'PLANNING';
            saveSession(ctx);

            const pois = await searchPOIs(ctx.collectedConstraints.interests || [], []);
            const itinerary = await buildItinerary(
                pois,
                Number(ctx.collectedConstraints.days) || 3,
                ctx.collectedConstraints.pace || 'medium'
            );

            ctx.itinerary = itinerary;
            ctx.planGenerated = true;
            ctx.currentState = 'READY';
            saveSession(ctx);

            return {
                message: 'Here is your Dubai itinerary.',
                itinerary,
                currentState: 'READY'
            };
        }

        return {
            message: 'Tell me if you’d like me to generate the plan, or change something.',
            currentState: 'CONFIRMING'
        };
    }

    // -------------------
    // EXPLANATION FLOW
    // -------------------
    // -------------------
    // EXPLANATION FLOW
    // -------------------
    if (ctx.currentState === 'EXPLAINING') {
        const rag = await getGroundedAnswer(userInput);

        ctx.currentState = 'READY';
        saveSession(ctx);

        if (!rag || rag.sources.length === 0) {
            return {
                message: 'I don’t yet have verified public data for this place.',
                currentState: 'READY'
            };
        }

        return {
            message: rag.answer,
            sources: rag.sources,
            citations: rag.sources,
            currentState: 'READY'
        };
    }

    saveSession(ctx);
    console.log(
        '[STATE END]',
        ctx.currentState,
        'PLAN:', ctx.planGenerated
    );

    // Fallback
    return {
        message: 'Tell me how you’d like to continue.',
        currentState: ctx.currentState,
    };
}

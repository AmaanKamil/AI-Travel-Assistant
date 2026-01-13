import { Itinerary } from '../types/itinerary';
import { EvaluationReport } from '../types/evaluation';
import { OrchestratorState } from './stateMachine';

export interface SessionContext {
    sessionId: string;
    currentState: OrchestratorState;
    collectedConstraints: {
        days?: number;
        pace?: string;
        interests?: string[];
        constraints?: string[];
    };
    constraintsCollected: boolean;
    planGenerated: boolean;
    clarificationCount: number;
    userEmail?: string;
    itinerary?: Itinerary;
    lastEvaluation?: EvaluationReport;
    lastEditIntent?: any;
}

const sessions = new Map<string, SessionContext>();

export function getSession(sessionId: string): SessionContext | undefined {
    return sessions.get(sessionId);
}

export function saveSession(context: SessionContext): void {
    sessions.set(context.sessionId, context);
}

export function createNewSession(sessionId: string): SessionContext {
    const newContext: SessionContext = {
        sessionId,
        currentState: 'IDLE',
        collectedConstraints: {},
        constraintsCollected: false,
        planGenerated: false,
        clarificationCount: 0
    };
    sessions.set(sessionId, newContext);
    return newContext;
}

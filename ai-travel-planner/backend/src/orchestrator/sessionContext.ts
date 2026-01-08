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
    clarificationCount: number;
    itinerary?: Itinerary;
    lastEvaluation?: EvaluationReport;
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
        clarificationCount: 0
    };
    sessions.set(sessionId, newContext);
    return newContext;
}

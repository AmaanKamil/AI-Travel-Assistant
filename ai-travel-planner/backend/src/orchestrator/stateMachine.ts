export type OrchestratorState =
    | 'IDLE'
    | 'COLLECTING_INFO' // Replaces CLARIFYING
    | 'CONFIRMING'
    | 'PLANNING'
    | 'READY'          // Replaces PRESENTING/EVALUATING
    | 'EDITING'
    | 'EXPORTING'
    | 'AMBIGUOUS'      // For when we don't know what to do (PARSING is internal, not a waiting state)
    | 'ERROR';

export function getNextState(currentState: OrchestratorState, intentType: string): OrchestratorState {
    // This helper is for default "happy path" transitions.
    // Complex logic (like checking for missing fields) lives in the Orchestrator.

    switch (currentState) {
        case 'IDLE':
            return 'COLLECTING_INFO'; // Default start

        case 'COLLECTING_INFO':
            // Logic in orchestrator will determine if we stay here or move to CONFIRMING
            return 'CONFIRMING';

        case 'CONFIRMING':
            return 'PLANNING';

        case 'PLANNING':
            return 'READY';

        case 'READY':
            if (intentType === 'edit_itinerary') return 'EDITING';
            if (intentType === 'export') return 'EXPORTING';
            if (intentType === 'plan_trip') return 'COLLECTING_INFO'; // New trip
            return 'READY'; // Stay ready if just chatting

        case 'EDITING':
            return 'READY'; // Back to ready after edit

        case 'EXPORTING':
            return 'READY'; // Back to ready after export

        default:
            return 'IDLE';
    }
}

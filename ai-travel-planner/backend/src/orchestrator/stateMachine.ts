export type OrchestratorState =
    | 'IDLE'
    | 'LISTENING'
    | 'PARSING'
    | 'CLARIFYING'
    | 'CONFIRMING'
    | 'PLANNING'
    | 'EVALUATING'
    | 'PRESENTING'
    | 'EDITING'
    | 'EXPLAINING'
    | 'EXPORTING'
    | 'ERROR';

export function getNextState(currentState: OrchestratorState, intentType: string): OrchestratorState {
    switch (currentState) {
        case 'IDLE':
            return 'PARSING';

        case 'PARSING':
            if (intentType === 'plan_trip') return 'CONFIRMING'; // Assuming simplified flow where parsing leads to confirm check
            if (intentType === 'edit_itinerary') return 'EDITING';
            if (intentType === 'ask_question') return 'EXPLAINING';
            if (intentType === 'export') return 'EXPORTING';
            return 'ERROR';

        case 'CLARIFYING':
            return 'CONFIRMING'; // After clarification, we confirm

        case 'CONFIRMING':
            // In a real state machine, we'd check if user said "yes" or "no".
            // For this v1 scaffold, we assume "confirm" -> PLAN
            return 'PLANNING';

        case 'PLANNING':
            return 'EVALUATING';

        case 'EVALUATING':
            // Logic would split here based on pass/fail, but the orchestrator handles the branch.
            // The default "happy path" next state is presenting.
            return 'PRESENTING';

        case 'PRESENTING':
            // From presenting, we can go back to parsing new input
            return 'PARSING';

        default:
            return 'PARSING'; // Default fallback for stateless interaction
    }
}

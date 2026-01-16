import { ItineraryState } from './itineraryNormalizer';

export class ItineraryGate {
    static verify(state: ItineraryState): void {
        console.log(`[GATE] Verifying payload...`);

        if (!state.metadata) {
            console.error(`[GATE] REJECTED: Missing metadata`);
            throw new Error("SecurityError: Payload missing provenance metadata.");
        }

        if (state.metadata.source !== 'BUILDER') {
            console.error(`[GATE] REJECTED: Invalid source ${state.metadata.source}`);
            throw new Error(`SecurityError: Invalid payload source: ${state.metadata.source}`);
        }

        if (state.metadata.version < 1) {
            console.error(`[GATE] REJECTED: Deprecated version ${state.metadata.version}`);
            throw new Error(`SecurityError: Deprecated payload version: ${state.metadata.version}`);
        }

        console.log(`[GATE] APPROVED (v${state.metadata.version})`);
    }
}

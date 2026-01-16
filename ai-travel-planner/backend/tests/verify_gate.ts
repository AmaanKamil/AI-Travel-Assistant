import { ItineraryGate } from '../src/core/itineraryGate';
import { ItineraryState } from '../src/core/itineraryNormalizer';

console.log(">>> VERIFYING GATEKEEPER >>>");

const validPayload: ItineraryState = {
    items: [],
    metadata: { source: 'BUILDER', version: 1 }
};

const invalidSourcePayload: ItineraryState = {
    items: [],
    metadata: { source: 'LLM', version: 1 } as any
};

const missingMetadataPayload: ItineraryState = {
    items: []
};

// TEST 1: Valid
try {
    ItineraryGate.verify(validPayload);
    console.log("PASS: Valid payload accepted");
} catch (e) {
    console.error("FAIL: Valid payload rejected", e);
}

// TEST 2: Invalid Source
try {
    ItineraryGate.verify(invalidSourcePayload);
    console.error("FAIL: Invalid source accepted");
} catch (e: any) {
    if (e.message.includes("Invalid payload source")) console.log("PASS: Invalid source rejected");
    else console.error("FAIL: Wrong error for invalid source", e.message);
}

// TEST 3: Missing Metadata
try {
    ItineraryGate.verify(missingMetadataPayload);
    console.error("FAIL: Missing metadata accepted");
} catch (e: any) {
    if (e.message.includes("Missing metadata")) console.log("PASS: Missing metadata rejected");
    else console.error("FAIL: Wrong error for missing metadata", e.message);
}

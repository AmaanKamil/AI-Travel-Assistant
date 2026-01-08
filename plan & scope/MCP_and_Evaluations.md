# MCP Tools and Evaluation Design

---

## 1. Purpose of This Document
This document outlines the engineering approach for ensuring intelligence, grounding, and safety within the Voice-Based AI Travel Planner. It specifies the design of specialized Model Context Protocol (MCP) tools and the automated evaluation gates used to verify every generated output before it reaches the user.

---

## 2. MCP Strategy Overview
The system delegates complex reasoning and data retrieval to specialized MCP tools rather than relying on a single, long-form LLM prompt. This strategy provides:

*   **Determinism:** Logic-heavy tasks (like time-sequencing) use algorithmic rules rather than probabilistic next-token prediction.
*   **Grounding:** Tools act as a bridge to verified external datasets (OpenStreetMap, etc.).
*   **Maintainability:** Individual capabilities (search vs. planning) can be debugged and optimized in isolation.
*   **Testability:** Tools can be unit-tested against mock data to ensure reliability.

---

## 3. MCP Tool 1: POI Search MCP

### 3.1 Purpose
The POI Search MCP is responsible for identifying and ranking verifiable points of interest in Dubai that align with the user’s stated preferences and constraints.

### 3.2 Inputs
*   **City:** Locked to "Dubai" for V1.
*   **Interests:** List of categories (e.g., "fine dining", "heritage", "adventure").
*   **Pace:** User preference for activity density.
*   **Constraints:** High-level filters (e.g., "family-friendly", "indoor-only").

### 3.3 Outputs
*   **POI List:** A collection of ranked locations with unique IDs.
*   **Metadata:** Operational hours, location coordinates, and descriptions.
*   **Dataset References:** URIs/Citations pointing to the raw data source.
*   **Confidence Score:** A metric indicating the relevance of the match to user interests.

### 3.4 Failure Handling
If no matching POIs are found, the tool returns a categorized error (e.g., `INSUFFICIENT_CRITERIA`). The Orchestrator then prompts the user to broaden their search (e.g., "We couldn't find many 'snowboarding' spots in Dubai—can we look for 'indoor sports' instead?").

---

## 4. MCP Tool 2: Itinerary Builder MCP

### 4.1 Purpose
The Itinerary Builder MCP transforms raw candidate POIs into a structured, chronologically sound day-wise itinerary.

### 4.2 Inputs
*   **Trip Metadata:** Start date and duration (2-4 days).
*   **Planning Rules:** Global constraints like "start after 9 AM", "30-min buffer between stops".
*   **Preferences:** Preferred meal times and daily end-times.
*   **Candidate POIs:** The ranked list provided by the POI Search MCP.

### 4.3 Outputs
*   **Structured Itinerary:** JSON object organized by Day -> Block (Morning/Afternoon/Evening).
*   **Timings:** Estimated duration for each activity.
*   **Logistics:** Travel time estimates between sequential locations.

### 4.4 Edit Mode (Surgical Updates)
When a user requests an edit (e.g., "Make Day 2 morning more relaxed"), the tool accepts an "Edit Scope" parameter. It locks the state of other days and only re-calculates the internal logic for the affected blocks to maintain plan stability.

### 4.5 Failure Handling
If the tool cannot fit the requested activities into the time window, it returns a `FEASIBILITY_CONFLICT`. It provides suggestions for removals or shorter durations to help the Orchestrator resolve the conflict with the user.

---

## 5. Evaluation Strategy Overview
Evaluations are not merely post-hoc tests—they are runtime gates. Every generated payload from the Orchestrator must pass through the Evaluation Service before being rendered on the UI. This ensures the system self-corrects hallucinations or plan logic errors.

---

## 6. Evaluation 1: Feasibility Check

*   **Purpose:** To ensure the plan is physically possible within the city limits and time constraints.
*   **Inputs:** Full structured itinerary + Transit heuristics.
*   **Rules:**
    *   Total activity time + travel time < total available daily window.
    *   No overlapping sequences.
    *   Operational hours of POIs are respected.
*   **Outputs:** `PASS`, `WARN` (with suggestions), or `FAIL`.
*   **System Behavior:** On `FAIL`, the system triggers an internal re-draft request to the Itinerary Builder MCP before apologizing to the user.

---

## 7. Evaluation 2: Edit Correctness Check

*   **Purpose:** To verify that a requested voice edit was applied correctly without corrupting the rest of the plan.
*   **Inputs:** Original Itinerary, Edit Command, and Updated Itinerary.
*   **Logic:** Perfoms a diff between the two states. It ensures changes are confined to the requested `Edit Scope`.
*   **Outputs:** Boolean `VALID_EDIT` or `INCONSISTENT_STATE`.
*   **System Behavior:** If inconsistent, the system rolls back to the previous stable state and explains the limitation to the user.

---

## 8. Evaluation 3: Grounding and Hallucination Check

*   **Purpose:** To ensure all POIs and facts are real and sourced.
*   **Inputs:** Final generated text + RAG source documents.
*   **Requirements:**
    *   Every POI mentioned must exist in the input dataset.
    *   Every factual claim (e.g., "This beach is free") must be supported by a retrieved document.
*   **Missing Data:** If a claim isn't supported, the system must prefix it with "According to general knowledge" or, ideally, remove it.
*   **Outputs:** Grounding Score (0-1). Scores below 0.9 trigger a re-generation using stricter grounding prompts.

---

## 9. Evaluation Flow in the System
1.  **Generation:** Orchestrator creates a candidate plan.
2.  **Parallel Evals:** The itinerary is sent to Feasibility and Grounding services simultaneously.
3.  **Aggregation:** Orchestrator collects results.
    *   **All Pass:** Payload sent to UI.
    *   **Minor Warning:** Payload sent to UI with a "Heads up" message.
    *   **Major Failure:** Internal retry logic is triggered (max 2 retries). If retries fail, a "Safety Fallback" response is given to the user.

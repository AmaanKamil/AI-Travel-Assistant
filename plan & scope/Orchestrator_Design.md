# Orchestrator Design for the Voice-Based AI Travel Planner

---

## 1. Purpose of This Document
This document defines the orchestration logic of the Voice-Based AI Travel Planner for Dubai. The orchestrator serves as the core "command and control" center, managing the conversation flow, external tool coordination (MCP), knowledge retrieval (RAG), quality evaluations, and downstream automation. This design ensures that the system is reliable, safety-aware, and logically consistent.

---

## 2. Orchestrator Philosophy
The orchestrator is built on a **Hybrid Control Model**:
*   **Rule-Based State Machine:** Governs the high-level deterministic flow (e.g., ensuring a user confirms constraints before planning begins).
*   **LLM-Assisted Reasoning:** Operates *within* specific states to handle the nuances of natural language, such as extracting intents or phrasing clarifying questions.

This approach was chosen over a purely prompt-driven chatbot to eliminate "hallucinated workflows" and ensure the agent follows a predictable, professional path to a high-quality itinerary.

---

## 3. High-Level Responsibilities

### What the Orchestrator Owns:
*   **Session Management:** Maintaining conversation state across multiple turns.
*   **Extraction:** Distilling structured intents and entities from raw text.
*   **Clarification Logic:** Determining when data is insufficient and generating follow-up queries.
*   **Verification:** Mediating the confirmation step between the user and the planning engine.
*   **Coordination:** Sequentially calling MCP tools, RAG services, and Evaluation modules.
*   **Error Handling:** Managing fallbacks and graceful degradation.

### What the Orchestrator Does NOT Own:
*   **Data Sourcing:** It does not manually select POIs from its internal weights; it relies on the POI Search MCP.
*   **Fact Manufacturing:** It does not "hallucinate" travel tips; it retrieves them via RAG.
*   **Math and Scheduling:** It does not calculate transit times manually; it uses the Itinerary Builder MCP.
*   **Final Decision Power:** It cannot skip the "Evaluation" gate for safety.

---

## 4. Orchestrator State Machine Overview
The orchestrator transitions through a defined set of states:
1.  **IDLE** - Waiting for input.
2.  **LISTENING** - Capturing voice transcript.
3.  **PARSING** - Intent and entity extraction.
4.  **CLARIFYING** - Collecting missing constraints.
5.  **CONFIRMING** - Verifying travel parameters with the user.
6.  **PLANNING** - Orchestrating MCP and RAG calls.
7.  **EVALUATING** - Running quality and safety gates.
8.  **PRESENTING** - Displaying results on the UI.
9.  **EDITING** - Handling targeted, voice-based modifications.
10. **EXPLAINING** - Answering grounded follow-up questions.
11. **EXPORTING** - Triggering delivery workflows.
12. **ERROR** - Handling system or logic failures.

---

## 5. Detailed State Definitions

### 5.1 IDLE
*   **Purpose:** System waiting for user engagement.
*   **Entry Condition:** App initialization or previous session reset.
*   **Actions:** Initialize session context; clear previous data.
*   **Transitions:** → `LISTENING` (when speech detected).

### 5.2 LISTENING
*   **Purpose:** Securely capture user intent.
*   **Entry Condition:** Voice stream starts.
*   **Actions:** Receive live text from Voice Layer; buffer final transcript.
*   **Transitions:** → `PARSING` (when user stops speaking).

### 5.3 PARSING
*   **Purpose:** Convert natural language into a system-readable Intent Object.
*   **Actions:** Use LLM to extract `intent_type` (`plan_trip`, `edit`, `ask_question`, `export`) and `entities` (days, pace, interests).
*   **Transitions:**
    *   `plan_trip` + Incomplete Data → `CLARIFYING`
    *   `plan_trip` + Complete Data → `CONFIRMING`
    *   `edit_itinerary` → `EDITING`
    *   `ask_question` → `EXPLAINING`
    *   `export` → `EXPORTING`

### 5.4 CLARIFYING
*   **Purpose:** Interactively refine the user’s travel profile.
*   **Entry Condition:** Required fields missing (and `< 6` clarifications).
*   **Actions:** Generate a natural language clarification question (e.g., "Will you be traveling solo?").
*   **Transitions:** → `CONFIRMING` (once parameters are satisfied).

### 5.5 CONFIRMING
*   **Purpose:** Explicit gate to ensure user intent matches system interpretation.
*   **Actions:** Summarize interpreted constraints; ask for a final "Yes/No."
*   **Transitions:**
    *   Correction → `PARSING`
    *   Confirmation → `PLANNING`

### 5.6 PLANNING
*   **Purpose:** Execute calculations and retrieval.
*   **Actions:** Sequentially trigger POI Search MCP, Itinerary Builder MCP, and RAG service.
*   **Transitions:** → `EVALUATING`.

### 5.7 EVALUATING
*   **Purpose:** Quality and safety verification.
*   **Actions:** Execute Feasibility, Grounding, and Edit Correctness services.
*   **Transitions:**
    *   `Pass` → `PRESENTING`
    *   `Warn` → `PRESENTING` (with UI banners)
    *   `Fail` → `PLANNING` (re-drafting) or `ERROR`.

### 5.8 PRESENTING
*   **Purpose:** Content delivery.
*   **Actions:** Package the JSON itinerary for UI rendering; attach RAG citations.
*   **Transitions:** Await user follow-up (→ `EXPLAINING`, `EDITING`, or `EXPORTING`).

### 5.9 EDITING
*   **Purpose:** Targeted state modification.
*   **Actions:** Determine "Edit Scope" via LLM; call Itinerary Builder MCP for the specific delta; run Edit Correctness eval.
*   **Transitions:** → `PRESENTING`.

### 5.10 EXPLAINING
*   **Purpose:** Grounded "Why" and "What-if" handling.
*   **Actions:** Route user query to RAG Service; format answer with specific source citations.
*   **Transitions:** → `PRESENTING`.

### 5.11 EXPORTING
*   **Purpose:** Final fulfillment.
*   **Actions:** Send final validated JSON to n8n Webhook; track generation status.
*   **Transitions:** → `IDLE` (on success) or `ERROR`.

### 5.12 ERROR
*   **Purpose:** User safety and recovery.
*   **Actions:** Log technical error; provide a helpful explanation and a "Reset" or "Retry" option.

---

## 6. Where the LLM is Used
To maintain precision, the LLM is used exclusively for non-deterministic tasks:

*   **Extraction:** Turning human speech into structured JSON schemas.
*   **Conversational Logic:** Phrasing natural clarifying questions and summaries.
*   **Synthesis:** Merging RAG retrieval results into helpful narrative explanations.

**The LLM is NOT used for:** Picking POIs, calculating travel times, determining logical feasibility, or deciding which dataset sources are "real." Those tasks are delegated to MCP tools and logic-based Evaluation services.

---

## 7. How This Design Supports Safety and Trust
*   **Predictability:** The state machine ensures the system never skips critical confirmation or evaluation steps.
*   **Grounding:** By separating intent parsing from plan generation, the system ensures it only plans what exists in its data tools.
*   **State Stability:** Scoped editing prevents a single voice command from accidentally overwriting an entire multi-day trip.
*   **Transparency:** The orchestrator forces a citation requirement on all planning outputs before they reach the UI.

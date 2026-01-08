# End-to-End System Data Flow

---

## 1. Purpose of This Document
This document defines the sequential flow of data and decision-making within the Voice-Based AI Travel Planner. It tracks the transformation of a raw audio signal into a structured, grounded, and verified travel itinerary, highlighting key checkpoints for tool orchestration, RAG retrieval, automated evaluations, and delivery automation.

---

## 2. High Level Flow Summary
The system operates on an orchestration-led loop. It converts user voice input into structured intents, refines these through clarifying dialogue, and then triggers a specialized toolchain—utilizing MCP for planning and RAG for grounding. Before the output reaches the user, it is intercepted by an evaluation service for quality assurance. The cycle concludes with a persistent visual UI and an automated n8n workflow for final document delivery.

---

## 3. Detailed Interaction Flow

### Stage 1: User Interaction and Voice Capture
1.  **UI Entry:** User launches the single-page application and initiates a voice session.
2.  **Streaming:** Local microphone capture streams audio data to the **Voice Layer**.
3.  **STT Processing:** Speech-to-Text converts audio into a text transcript.
4.  **Hand-off:** The transcript is transmitted to the **Orchestration Layer** (Backend via WebSocket/REST).

### Stage 2: Intent Understanding and Conversation Control
1.  **Parsing:** The Orchestrator extracts structured entities (duration, interests, pace).
2.  **Constraint Analysis:** The system identifies missing data points (e.g., "solo vs family", "indoor vs outdoor").
3.  **Clarification:** If constraints are insufficient, the Orchestrator generates a clarifying question for the UI.
4.  **Looping:** This stage repeats until a complete "Travel Prompt" is formed.

### Stage 3: Constraint Confirmation
1.  **Recap:** The system generates a verbal and visual summary of the interpreted trip parameters.
2.  **Assent:** The user provides voice or UI confirmation.
3.  **Execution Trigger:** Upon confirmation, the backend transitions from "Discovery Mode" to "Planning Mode."

### Stage 4: Planning via MCP Tools
1.  **Discovery Call:** Orchestrator calls the **POI Search MCP** with city and user interests.
2.  **Candidate Retrieval:** The MCP returns a ranked list of grounded POIs with metadata.
3.  **Assembly Call:** Orchestrator sends candidates and pace constraints to the **Itinerary Builder MCP**.
4.  **Logical Structure:** The MCP returns a day-wise itinerary following time-block logic.

### Stage 5: Grounding and Explanations
1.  **RAG Query:** Orchestrator queries the **RAG Service** using the POIs and user profile.
2.  **Context Injection:** The service retrieves city-specific guidance, safety tips, and cultural etiquette.
3.  **Citation Attachment:** Every recommendation in the itinerary is updated with a specific data source or reference URI.

### Stage 6: Evaluation Flow
1.  **Validation Request:** The Orchestrator submits the raw itinerary to the **Evaluation Service**.
2.  **Stress Testing:**
    *   **Feasibility:** Are travel times realistic?
    *   **Grounding:** Are all POIs real?
    *   **Safety:** Are recommendations compliant with travel guidance?
3.  **Report Return:** If evaluations pass, the intent proceeds; if not, the Orchestrator triggers an internal retry or corrective prompt.

### Stage 7: UI Rendering
1.  **Payload Delivery:** The final, verified itinerary and RAG-sourced explanations are sent to the Frontend.
2.  **Component Rendering:** The UI displays the day-wise blocks, timing estimates, and a dedicated "Sources" sidebar.

### Stage 8: Voice-Based Editing
1.  **Edit Request:** User speaks a change (e.g., *"Make Day 2 morning more relaxed"*).
2.  **Surgical Parsing:** Orchestrator identifies the specific delta.
3.  **Logical Re-build:** It calls the **Itinerary Builder MCP** to adjust only the affected section.
4.  **Verification:** A targeted "Edit Correctness" evaluation runs before updating the UI state.

### Stage 9: Question Answering (Deep Dives)
1.  **Inquiry:** User asks a follow-up (e.g., *"Why did you pick this restaurant?"*).
2.  **Targeted RAG:** Orchestrator routes the specific question to the RAG service.
3.  **Grounded Response:** The system returns a descriptive answer tied to a source, displayed in the chat logs.

### Stage 10: PDF Generation and Automation
1.  **Export Trigger:** User asks for the final plan, or clicks the "Export" CTA.
2.  **Workflow Hook:** Backend triggers an **n8n Webhook** with the complete itinerary JSON.
3.  **Document Assembly:** n8n converts JSON to a professional PDF.
4.  **Final Delivery:** n8n sends an email to the user and confirms the status back to the app UI.

---

## 4. Failure and Fallback Paths

*   **Data Source Unavailability:** If the Overpass API or dataset is down, the system provides a "Fallback Itinerary" based on high-level RAG cached data, with a warning about real-time precision.
*   **Search Failure (No Results):** If user interests yield no POIs, the system explicitly states the lack of data and asks to widen the search criteria (e.g., "include general tourism landmarks").
*   **Evaluation Rejection:** If a plan is flagged as unfeasible, the system apologizes and attempts one automated re-draft focusing on reducing density.
*   **Automation Failure:** If n8n fails to generate the PDF, the UI provides a "Manual Download" link of the browser-rendered view as a temporary bypass.

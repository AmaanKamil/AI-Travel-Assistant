# Architecture Overview for the Voice-Based AI Travel Planner

---

## 1. Purpose of This Document
This document provides a comprehensive overview of the high-level architecture of the Voice-Based AI Travel Planner for Dubai. It outlines how coordinated layers and modular components interact to deliver a voice-first, grounded, and safety-verified AI planning experience. The architecture defined here ensures reliability, observability, and modularity throughout the development lifecycle.

---

## 2. Design Principles
The system architecture is guided by the following core principles:

*   **Separation of Concerns:** Distinct boundaries between voice processing, orchestration logic, specialized tools, and data retrieval.
*   **Tool-Based Orchestration:** Moving beyond monolithic prompt engineering in favor of a modular approach where an agent coordinates specialized tools to solve complex constraints.
*   **Grounding Before Generation:** Ensuring that all itinerary data is retrieved and verified from structured datasets before a plan is presented to the user.
*   **Evaluations as First-Class Citizens:** Automated quality gates integrated directly into the system flow to verify feasibility and safety.
*   **Automation as a Product Feature:** Delivery mechanisms (like PDF generation and email) are treated as fundamental components of the product experience.

---

## 3. High-Level System View
The system is architected as a set of cooperating layers, each responsible for a specific domain of the user experience and logic.

### 3.1 Frontend
A single-page application (SPA) that acts as the primary interface. It handles:
*   User interaction and state management.
*   Voice capture and audio streaming.
*   Visualizing live transcripts, day-wise itineraries, and data sources.
*   Triggering export workflows.

### 3.2 Voice Layer
A speech-to-text (STT) service that converts real-time audio input into structured text, allowing the system to process natural language intents.

### 3.3 Orchestration Layer
The "Central Brain" of the system. It is responsible for:
*   Managing the conversation state and session memory.
*   Extracting user intents and refining travel constraints.
*   Executing the planning loop (coordinating calls to MCP tools and RAG).
*   Synthesizing responses and assembling the final itinerary structure.

### 3.4 MCP Tools (Model Context Protocol)
Independent, specialized microservices that provide the orchestration layer with external capabilities:
*   **POI Search MCP:** Queries structured datasets for Dubai-specific points of interest based on user preferences.
*   **Itinerary Builder MCP:** A logic engine that sequences POIs into a feasible, time-bound daily schedule.

### 3.5 RAG Service (Retrieval-Augmented Generation)
A knowledge retrieval pipeline that provides grounded travel guidance, safety etiquette, and logical justifications for recommendations using a curated database of Dubai travel sources.

### 3.6 Evaluation Service
An automated quality control layer that runs post-generation checks for:
*   **Feasibility:** Logical consistency of time and travel.
*   **Edit Correctness:** Ensuring voice modifications only impact the intended plan segments.
*   **Grounding:** Verifying all output against original dataset records.

### 3.7 Automation Layer
Execution workflows (powered by n8n) that handle the final delivery of the product:
*   **PDF Generation:** Compiling the structured itinerary into a professional document.
*   **Email Delivery:** Distributing the final plan to the user’s inbox.

### 3.8 Deployment Layer
The underlying infrastructure providing hosting, environmental configuration, logging, and monitoring across all services.

---

## 4. Responsibilities by Layer

| Layer | Responsibility | What It Does NOT Own |
| :--- | :--- | :--- |
| **Frontend** | Voice capture, visual state, UX. | Reasoning logic, data storage. |
| **Voice Layer** | Signal-to-text conversion. | Intent interpretation, planning. |
| **Orchestration** | Decision making, loop control. | Raw data searching, file generation. |
| **MCP Tools** | Specialized logic (search/build). | Conversation context, UI rendering. |
| **RAG Service** | Information retrieval, guidance. | Itinerary sequencing, PDF styling. |
| **Evaluation** | Quality benchmarks, safety. | Generating the initial draft. |
| **Automation** | Document creation, delivery. | Real-time planning logic. |

---

## 5. Why This Architecture?
While a simple chatbot could provide generic travel advice, this layered architectural approach was chosen to ensure:

*   **Reliability:** Modular tools succeed where single prompts fail in complex spatial reasoning.
*   **Explainability:** By separating data search from synthesis, the system can provide clear citations for every recommendation.
*   **Safety:** The dedicated evaluation layer allows the system to reject or flag unfeasible or hallucinated plans.
*   **Scalability:** Individual components (like a specific MCP tool) can be upgraded or replaced without refactoring the entire system.
*   **Professional Discipline:** This structure reflects high-end engineering standards, moving from "experiment" to "production-grade system."

---

## 6. Summary
The Voice-Based AI Travel Planner is designed as a robust, modular ecosystem. Every layer has a specific, testable responsibility. This design ensures that the final system is not just functional, but is a grounded, explainable, and production-ready demonstration of modern GenAI system design.

# Voice-Based AI Travel Planner with MCP, RAG, and Evaluations

---

## 1. Problem Overview
People do not struggle to find places to visit; they struggle to turn preferences, time constraints, travel effort, weather, and personal pace into a realistic and executable travel plan.

Most travel applications focus on **discovery**. Very few focus on **feasibility**.

This project aims to bridge that gap by building a voice-first AI assistant that creates practical itineraries, explains its decisions, and adapts plans through natural conversation.

---

## 2. What We Are Building
A deployed voice-first AI travel planner with a minimal companion UI. The system is designed to:

*   **Collect trip preferences** through natural conversation.
*   **Generate a feasible, day-wise itinerary.**
*   **Allow users to edit the plan** using voice commands.
*   **Explain recommendations** with reasoning grounded in data.
*   **Validate suggestions** against publicly available datasets.
*   **Automate delivery** by generating a PDF itinerary and emailing it via an n8n workflow.

---

## 3. Core Capabilities

### 3.1 Voice-Based Trip Planning
The assistant must support spoken requests such as:
> "Plan a 3-day trip to Jaipur next weekend. I like food and culture, relaxed pace."

Key requirements:
*   Ask **clarifying questions only when required** (maximum 6).
*   **Confirm constraints** before generating the itinerary.
*   Respect **time, pace, and feasibility**.

### 3.2 Voice-Based Editing
Users must be able to modify the itinerary using voice commands, such as:
*   "Make Day 2 more relaxed."
*   "Swap the Day 1 evening plan to something indoors."
*   "Reduce travel time."
*   "Add one famous local food place."

**Constraint:** Only the affected part of the itinerary should change; the rest must remain stable.

### 3.3 Explanation and Reasoning
The assistant must be capable of answering questions regarding its decisions:
*   "Why did you pick this place?"
*   "Is this plan doable?"
*   "What if it rains?"

**Constraint:** All explanations must be **grounded in data**, avoiding generic responses.

---

## 4. Companion UI Requirements
The user interface will be minimal, serving as a visual reference for the conversation. Requirements include:

*   **Day-wise itinerary layout.**
*   **Time blocks:** Morning, Afternoon, Evening.
*   **Logistics:** Duration and estimated travel time between stops.
*   **Voice Control:** Microphone button with live transcript.
*   **Citations:** A sources or references section showing data origins.

---

## 5. Data and Grounding Requirements

### 5.1 Datasets
The system will utilize publicly available datasets:
*   **Points of Interest (POIs):** OpenStreetMap via Overpass API.
*   **Travel Guidance:** Wikivoyage or Wikipedia.
*   **Weather:** Open-Meteo API (Optional).

### 5.2 Grounding Rules
*   **Alignment:** All POIs must map to actual dataset records.
*   **Verification:** All factual tips must come from RAG sources.
*   **Transparency:** If data is missing, the system must explicitly state it.

---

## 6. MCP Integration
The orchestration layer must utilize at least two Model Context Protocol (MCP) tools:

### required MCP Tools
1.  **POI Search MCP**
    *   **Inputs:** City, interests, constraints.
    *   **Outputs:** Ranked POIs with metadata.
2.  **Itinerary Builder MCP**
    *   **Inputs:** Candidate POIs, daily time window, pace.
    *   **Outputs:** Structured day-wise itinerary.

### Optional MCP Tools
*   Travel Time Estimator MCP
*   Weather Adjustment MCP

**Requirement:** The demo must clearly visualize MCP tool execution.

---

## 7. RAG Requirements
Retrieval-Augmented Generation (RAG) must be used for:
*   Practical city guidance.
*   Safety and etiquette information.
*   Explanation and justification of choices.

### Rules
*   **Citations:** All tips must have citations.
*   **Accuracy:** No hallucinated claims.
*   **UX:** Voice explanations can be brief, but full citations must appear in the UI.

---

## 8. AI Evaluation Requirements
Implement at least three distinct evaluations:

### 8.1 Feasibility Evaluation
*   Daily duration must be within the available time.
*   Travel times must be realistic.
*   Pace must be consistent with user preference.

### 8.2 Edit Correctness Evaluation
*   Voice edits must strictly modify only the intended sections.
*   No unintended side effects on other days.

### 8.3 Grounding and Hallucination Evaluation
*   POIs must map to dataset records.
*   Tips must cite RAG sources.
*   Missing data must be explicitly acknowledged.

*Note: Evaluations can be rule-based or LLM-assisted but must be executable.*

---

## 9. Workflow Automation
An n8n workflow must be implemented to:
1.  Generate a PDF itinerary.
2.  Email the PDF to the user.

---

## 10. Tech and Deployment Requirements
*   **Models:** Use LLM APIs.
*   **Input:** Support voice input via speech-to-text.
*   **Versioning:** Use Git for version control.
*   **Deployment:** The prototype application must be deployed publicly.

---

## 11. Deliverables
1.  **Public Application URL.**
2.  **5-Minute Demo Video:**
    *   Voice-based planning.
    *   Voice-based editing.
    *   Explanation reasoning.
    *   Sources view.
    *   Execution of at least one evaluation.
3.  **Git Repository:**
    *   README with architecture and setup.
    *   List of MCP tools used.
    *   Datasets referenced.
    *   Instructions to run evaluations.
    *   Sample test transcripts.

---

## 12. Scope Constraints
*   **Location:** Limit to one city.
*   **Duration:** Maximum 2 to 4-day itinerary.
*   **Logistics:** Transit estimates can be heuristic.
*   **Focus:** Prioritize quality of interaction over broad coverage.

---

## 13. Evaluation Rubric
| Component | Weight |
| :--- | :--- |
| Voice UX and intent handling | 25% |
| MCP usage and system design | 20% |
| Grounding and RAG quality | 15% |
| AI evaluations and iteration depth | 20% |
| Workflow automation | 10% |
| Deployment and code quality | 10% |

---

## 14. Success Criteria
The project is considered successful if it demonstrates:
*   Strong GenAI system design.
*   Responsible use of data and grounding.
*   Clear understanding of LLM limitations.
*   Practical evaluations and iteration.
*   Clear explanation of product and technical decisions.

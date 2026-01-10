# System End-to-End Tests

Run these tests manually to verify the stabilization of the AI Travel Assistant.

## Test 1: Planning Flow & Clarifications

### Goal
Verify strict clarification loop and successful planning.

### Steps
1. **Reset**: Refresh the page.
2. **Input**: "Plan a trip to Dubai."
3. **Expected Response**: "How many days are you planning to visit Dubai?" (or similar).
4. **Input**: "I'm not sure yet."
5. **Expected Response**: System should ask again or prompt for constraints, NOT generate a plan.
6. **Input**: "3 days."
7. **Expected Response**: "I understand you want a 3-day trip to Dubai. Shall I generate the plan?"
8. **Input**: "Yes."
9. **Result**: 
    - [x] Itinerary appears. 
    - [x] Voice speaks the confirmation.
    - [x] Plan has title "Your 3-Day Dubai Adventure (medium pace)".

## Test 2: Itinerary Quality & Deduplication

### Goal
Verify builder logic for deduplication and structure.

### Steps
1. **Inspect Itinerary**: Look at the plan generated in Test 1.
2. **Result**:
    - [x] Check Day 1 vs Day 2 vs Day 3.
    - [x] **NO** repeating places (e.g., "Relax at Hotel" shouldn't appear every morning).
    - [x] Activities match "Morning", "Afternoon", "Evening" slots.

## Test 3: Edit Flow

### Goal
Verify intent detection and isolated updates.

### Steps
1. **Input**: "Make Day 2 more relaxed."
2. **Expected Response**: "I've updated Day 2 for you. X activities are planned."
3. **Result**:
    - [x] Only Day 2 changes in the UI.
    - [x] Day 1 and 3 remain exactly the same.
    - [x] Voice speaks confirmation.

## Test 4: Export Flow

### Goal
Verify backend export endpoint and error handling.

### Steps
1. **Action**: Scroll to bottom of Voice Modal.
2. **Input**: Enter a valid email address.
3. **Action**: Click "Send to Email".
4. **Result**:
    - [x] Button shows "Sending...".
    - [x] Success message appears: "I've emailed the itinerary to you!".
    - [x] (Optional) Check backend logs for `[API] Exporting itinerary...`.

## Test 5: Explanation Flow (Grounding)

### Goal
Verify RAG pipeline and citations.

### Steps
1. **Input**: "Why did you choose the Dubai Mall?"
2. **Result**:
    - [x] Assistant speaks an answer.
    - [x] Answer mentions cultural/logistic reasons.
    - [x] Sources panel shows citations (e.g., Wikivoyage).

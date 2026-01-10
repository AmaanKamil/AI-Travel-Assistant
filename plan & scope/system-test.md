# Strict System Tests

## Test 1: Anti-Chain Restaurant Logic
**User Input**: "Plan a packed 3 day trip to Dubai" (May trigger chain search)
- [x] **State Check**: Transition `READY`.
- [x] **Content Check**: JSON does NOT contain "Pizza Hut", "McDonald's", "KFC".
- [x] **Content Check**: JSON does NOT contain Duplicate POIs.

## Test 2: Cultural Mandate
**User Input**: "3 days relaxed"
- [x] **Result**: Each day has at least 1 "Cultural" item (Museum, Fort, Souk).
- [x] **Result**: Pace is respected (Max 3 items/day).

## Test 3: Strict Clarification Flow
**User Input**: "Plan a trip" (No days, no pace)
- [x] **Response 1**: Asks ONLY for Days. "How many days...?"
- [x] **Input 2**: "3 days"
- [x] **Response 2**: Asks ONLY for Pace. "What pace...?" (No Loop)

## Test 4: Editing Correctness
**User Input**: "Make Day 2 more relaxed"
- [x] **Result**: Day 2 items reduced to <= 3.
- [x] **Voice**: Audio confirms "Updated Day 2".

## Test 5: Export Reliability
**User Input**: "Email this to test@example.com"
- [x] **Result**: Backend logs success or specific error (no crash).

## Test 6: Dubai Quality Baseline
**User Input**: "Plan a 3 day trip to Dubai"
- [x] **Mandatory**: Must contain "Burj Khalifa" AND "Dubai Mall".
- [x] **Forbidden**: Must NOT contain "School", "University", "Hospital", "Pizza Hut".

## Test 7: Global Deduplication
- [x] **Result**: No POI Name appears more than ONCE in the entire JSON.

## Test 8: Edit Quality (Famous Place)
**User Input**: "Add one famous place" (on Day 1)
- [x] **Result**: Added item must be "Landmark" or "Attraction" (e.g., Burj Al Arab).
- [x] **Forbidden**: Random office or generic business.

## Test 9: Regeneration Guard (Bad POI Attempt)
**User Input**: "Add a school" 
- [x] **Result**: System should reply "I can't add that" OR ignore and add a safe default.
- [x] **Forbidden**: Itinerary contains "School".

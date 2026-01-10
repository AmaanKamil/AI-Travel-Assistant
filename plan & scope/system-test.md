# System Tests

## Test 1: Planning Flow
**User Input**: "Plan a 3 day trip to Dubai. I like food and culture, relaxed pace."
- [x] **State Check**: Transition `IDLE` -> `COLLECTING` (if info missing) or `CONFIRMING`.
- [x] **System Response**: "I understand you want a 3-day trip... Shall I generate?"
- [x] **Voice**: Audio data returned (OpenAI TTS Verified).

## Test 2: Clarification Loop Prevention
**User Input**: "3 days" (if asked)
- [x] **State Check**: Transition `COLLECTING` -> `CONFIRMING`.
- [x] **System Response**: Confirmation message.
- [x] **No Loop**: Does not ask "How many days?" again.

## Test 3: Editing
**User Input**: "Make Day 2 more relaxed."
- [x] **State Check**: `READY` -> `EDITING` -> `READY`.
- [x] **Result**: Day 2 items reduced/modified.
- [x] **Voice**: Audio confirmation.

## Test 4: Export
**User Input**: "Send to email" (or UI click)
- [x] **State Check**: `EXPORTING`.
- [x] **Result**: Backend logs email send success/failure.
- [x] **UI**: Show success message.

## Test 5: Voice Quality
- [x] **Audio**: OpenAI TTS "Alloy" voice is used.
- [x] **Naturalness**: No robotic artifacts. Verified with Base64 audio response.

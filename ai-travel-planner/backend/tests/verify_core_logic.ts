import { reconstructItinerary } from '../src/core/itineraryReconstructor';
import { ItineraryState } from '../src/core/itineraryNormalizer';

console.log(">>> VERIFYING STRICT RECONSTRUCTION >>>");

const chaosState: ItineraryState = {
    items: [
        // DY 1 - CHAOS
        { id: '1', title: 'Dinner at WrongSlot', type: 'MEAL_DINNER', slot: 'MORNING', day: 1, estVisitMins: 60, estTravelMins: 0 }, // Wrong slot
        { id: '2', title: 'Lunch at WrongSlot', type: 'MEAL_LUNCH', slot: 'EVENING', day: 1, estVisitMins: 60, estTravelMins: 0 }, // Wrong slot
        { id: '3', title: 'Attraction 1', type: 'ATTRACTION', slot: 'AFTERNOON', day: 1, estVisitMins: 60, estTravelMins: 0 },
        { id: '4', title: 'Attraction 2', type: 'ATTRACTION', slot: 'EVENING', day: 1, estVisitMins: 60, estTravelMins: 0 },
        { id: '5', title: 'Attraction 3', type: 'ATTRACTION', slot: 'MORNING', day: 1, estVisitMins: 60, estTravelMins: 0 },
        { id: '6', title: 'Attraction 4', type: 'ATTRACTION', slot: 'AFTERNOON', day: 1, estVisitMins: 60, estTravelMins: 0 },
        { id: '7', title: 'Attraction 5', type: 'ATTRACTION', slot: 'MORNING', day: 1, estVisitMins: 60, estTravelMins: 0 },
    ]
};

const result = reconstructItinerary(chaosState);
const items = result.items;

console.log(JSON.stringify(items, null, 2));

// ASSERTIONS
console.log("\nASSERTIONS:");

const morning = items.filter(i => i.slot === 'MORNING');
const afternoon = items.filter(i => i.slot === 'AFTERNOON' && i.type !== 'MEAL_LUNCH');
const evening = items.filter(i => i.slot === 'EVENING' && i.type !== 'MEAL_DINNER');

const lunch = items.find(i => i.type === 'MEAL_LUNCH');
const dinner = items.find(i => i.type === 'MEAL_DINNER');

// 1. Check Lunch/Dinner Slots
if (lunch?.slot === 'AFTERNOON') console.log("PASS: Lunch moved to Afternoon");
else console.error("FAIL: Lunch is", lunch?.slot);

if (dinner?.slot === 'EVENING') console.log("PASS: Dinner moved to Evening");
else console.error("FAIL: Dinner is", dinner?.slot);

// 2. Check Activity Distribution (Template: 2 Morning + 2 Afternoon + Rest Evening)
if (morning.length === 2) console.log("PASS: Morning capped at 2 activities");
else console.error("FAIL: Morning count is", morning.length);

if (afternoon.length === 2) console.log("PASS: Afternoon capped at 2 activities");
else console.error("FAIL: Afternoon count is", afternoon.length);

if (evening.length === 1) console.log("PASS: Remaining activity moved to Evening"); // 5 activities total -> 2 morn, 2 aft, 1 eve
else console.error("FAIL: Evening count is", evening.length);

// 3. Check Order (visual check from JSON above, but programmatically)
const lunchIndex = items.findIndex(i => i.type === 'MEAL_LUNCH');
const dinnerIndex = items.findIndex(i => i.type === 'MEAL_DINNER');

// Lunch should be after morning (index >= 2) and before afternoon
if (lunchIndex >= morning.length) console.log("PASS: Lunch placed after Morning items");
else console.error("FAIL: Lunch placement");

// Dinner should be after afternoon (index >= morning + lunch + afternoon)
if (dinnerIndex >= (morning.length + 1 + afternoon.length)) console.log("PASS: Dinner placed after Afternoon items");
else console.error("FAIL: Dinner placement");

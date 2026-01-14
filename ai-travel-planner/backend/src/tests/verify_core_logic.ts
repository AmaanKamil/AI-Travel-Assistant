import { normalizeItinerary, ItineraryState } from '../core/itineraryNormalizer';

console.log(">>> VERIFYING CORE NORMALIZER >>>");

const testState: ItineraryState = {
    items: [
        { id: '1', title: 'Start', type: 'ATTRACTION', slot: 'MORNING', day: 1, estVisitMins: 60, estTravelMins: 0 },
        { id: '2', title: 'Lunch at Zuma', type: 'MEAL_LUNCH', slot: 'MORNING', day: 1, estVisitMins: 60, estTravelMins: 0 }, // INVALID SLOT
        { id: '3', title: 'Dinner at Armani', type: 'MEAL_DINNER', slot: 'AFTERNOON', day: 1, estVisitMins: 60, estTravelMins: 0 }, // INVALID SLOT
        { id: '4', title: 'Visit Mall', type: 'ATTRACTION', slot: 'AFTERNOON', day: 1, estVisitMins: 60, estTravelMins: 0 },
        { id: '5', title: 'Lunch at Duplicate', type: 'MEAL_LUNCH', slot: 'AFTERNOON', day: 1, estVisitMins: 60, estTravelMins: 0 } // DUPLICATE LUNCH
    ]
};

const normalized = normalizeItinerary(testState);
const items = normalized.items;

console.log(JSON.stringify(items, null, 2));

// ASSERTIONS
const lunch = items.find(i => i.type === 'MEAL_LUNCH');
const dinner = items.find(i => i.type === 'MEAL_DINNER');

if (lunch?.slot !== 'AFTERNOON') console.error("FAIL: Lunch not moved to Afternoon");
else console.log("PASS: Lunch moved to Afternoon");

if (dinner?.slot !== 'EVENING') console.error("FAIL: Dinner not moved to Evening");
else console.log("PASS: Dinner moved to Evening");

if (items.filter(i => i.type === 'MEAL_LUNCH').length !== 1) console.error("FAIL: Duplicate lunch not removed");
else console.log("PASS: Duplicate lunch removed");

if (lunch?.title === 'Lunch at Zuma') console.log("PASS: Lunch title formatted");
else console.error("FAIL: Lunch title malformed", lunch?.title);

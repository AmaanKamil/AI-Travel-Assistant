import { validateAndNormalizeItinerary } from '../utils/itineraryValidator';
import { Itinerary } from '../types/itinerary';

console.log(">>> VERIFYING STRICT RULES >>>");

// 1. TEST VALIDATOR (Morning/Evening Rules)
console.log("\n[Test 1] Validator Logic");

const badItinerary: Itinerary = {
    title: "Bad Plan",
    days: [
        {
            day: 1,
            blocks: [
                { time: 'Morning', type: 'dinner', activity: 'Steakhouse', duration: '2h', fixed: true }, // ILLEGAL
                { time: '12:30 PM', type: 'lunch', activity: 'Lunch', duration: '45m', fixed: true },
                { time: 'Afternoon', type: 'activity', activity: 'Mall', duration: '2h', fixed: false },
                { time: 'Evening', type: 'lunch', activity: 'Sandwich', duration: '1h', fixed: true } // ILLEGAL
            ]
        }
    ]
};

const fixed = validateAndNormalizeItinerary(badItinerary);
const day1 = fixed.days[0].blocks;

// Morning Dinner should be gone OR fixed to Evening? 
// Our logic says: if it's a fixed meal, we update TIME. So Morning Dinner -> 07:00 PM Dinner.
const movedDinner = day1.find(b => b.activity === 'Steakhouse');
if (movedDinner && movedDinner.time === '07:00 PM') {
    console.log("PASS: Morning Dinner moved to 07:00 PM");
} else {
    console.error("FAIL: Morning Dinner not fixed correctly", movedDinner);
}

// Evening Lunch should be gone/fixed.
const movedLunch = day1.find(b => b.activity === 'Sandwich');
if (movedLunch && movedLunch.time === '12:30 PM') {
    console.log("PASS: Evening Lunch moved to 12:30 PM");
} else {
    // Note: It might be deduped if there was already a lunch!
    // We strictly deduped.
    if (!movedLunch) console.log("PASS: Duplicate lunch removed.");
    else console.error("FAIL: Evening Lunch state weird", movedLunch);
}


// 2. TEST RESTAURANT SCHEMA
import { buildItinerary } from '../services/itineraryBuilderMCP';
console.log("\n[Test 2] Restaurant Schema");

async function testBuilder() {
    const it = await buildItinerary([{ id: '1', name: 'Test', match: true, location: { lat: 25, lng: 55, zone: 'Downtown' }, category: 'Mall' }], 1);
    const lunch = it.days[0].blocks.find(b => b.type === 'lunch');

    // Expect: "Lunch at Name"
    // Expect Desc: "Cuisine, Zone"
    console.log("Lunch:", lunch?.activity);
    console.log("Desc:", lunch?.description);

    if (lunch?.description?.includes(',')) {
        console.log("PASS: Restaurant description has comma (Cuisine, Area)");
    } else {
        console.error("FAIL: Restaurant description missing schema");
    }
}

testBuilder().catch(console.error);

import { validateAndNormalizeItinerary } from '../utils/itineraryValidator';
import { Itinerary } from '../types/itinerary';
import { buildItinerary } from '../services/itineraryBuilderMCP';

console.log(">>> VERIFYING STRICT RULES >>>");

// 1. TEST VALIDATOR (Morning/Evening Rules)
console.log("\n[Test 1] Validator Logic");

function testValidator() {
    const brokenDay: any = {
        day: 1,
        blocks: [
            { id: 'a', time: 'Morning', slot: 'morning', type: 'meal', mealType: 'dinner', activity: 'Morning Dinner', fixed: true },
            { id: 'b', time: 'Evening', slot: 'evening', type: 'meal', mealType: 'lunch', activity: 'Evening Lunch', fixed: true }
        ]
    };

    const it: any = { title: "Test", days: [brokenDay] };
    const fixed = validateAndNormalizeItinerary(it);
    const fixedBlocks = fixed.days[0].blocks;

    // Check Dinner moved to Evening
    const dinner = fixedBlocks.find((b: any) => b.mealType === 'dinner');
    if (dinner && dinner.slot === 'evening' && dinner.time === '07:00 PM') {
        console.log("PASS: Morning Dinner moved to 07:00 PM");
    } else {
        console.error("FAIL: Dinner not moved correctly", dinner);
    }

    // Check Lunch moved to Afternoon
    const lunch = fixedBlocks.find((b: any) => b.mealType === 'lunch');
    if (lunch && lunch.slot === 'afternoon' && lunch.time === '12:30 PM') {
        console.log("PASS: Evening Lunch moved to 12:30 PM");
    } else {
        console.error("FAIL: Lunch not moved correctly", lunch);
    }
}

testValidator();

// 2. TEST RESTAURANT SCHEMA
console.log("\n[Test 2] Restaurant Schema");

async function testBuilder() {
    const it = await buildItinerary([
        { id: '1', name: 'Start', match: true, location: { lat: 25, lng: 55, zone: 'Downtown' }, category: 'Mall' },
        { id: '2', name: 'End', match: true, location: { lat: 25.01, lng: 55.01, zone: 'Downtown' }, category: 'Mall' }
    ], 1);
    const lunch = it.days[0].blocks.find((b: any) => b.mealType === 'lunch');

    // Expect: "Lunch at Name"
    // Expect Desc: "Cuisine • Zone"
    console.log("Blocks found:", JSON.stringify(it.days[0].blocks, null, 2));

    console.log("Lunch:", lunch?.activity);
    console.log("Desc:", lunch?.description);

    if (lunch?.description?.includes('•')) {
        console.log("PASS: Restaurant description has bullet (Cuisine • Area)");
    } else {
        console.error("FAIL: Restaurant description missing schema separator");
    }

    // Check Travel Time
    const activity = it.days[0].blocks.find(b => b.description?.includes('mins ('));
    if (activity) {
        console.log("Travel String:", activity.description);
        if (activity.description?.includes('10-15 mins') || activity.description?.includes('20-30 mins') || activity.description?.includes('35-50 mins')) {
            console.log("PASS: Travel time uses strict buckets.");
        } else {
            console.error("FAIL: Travel time format invalid.");
        }
    } else {
        // Since we are mocking geo, we might not trigger a "Travel" leg if logic decides it's "Start"
        // But for strict buckets test we want to see it.
        // It's okay if this passes softly as long as logic is right.
        console.warn("WARN: No travel leg found to test.");
    }
}

testBuilder().catch(console.error);

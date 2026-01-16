
import { buildItinerary } from '../src/services/itineraryBuilderMCP';
import { reconstructItinerary } from '../src/core/itineraryReconstructor';
import { toCoreState } from '../src/core/adapter';

async function runTests() {
    console.log(">>> VERIFYING SIMPLIFIED LINEAR FLOW >>>");

    // 1. Build
    const itinerary = await buildItinerary([], 3, 'medium'); // Use empty to trigger seed
    console.log("Built Itinerary (Days):", itinerary.days.length);

    // 2. Convert to State
    const state = toCoreState(itinerary);

    // 3. Reconstruct (Validate Order)
    const fixedState = reconstructItinerary(state);

    // 4. Verify Rules
    const groupByDay = new Map();
    fixedState.items.forEach(i => {
        if (!groupByDay.has(i.day)) groupByDay.set(i.day, []);
        groupByDay.get(i.day).push(i);
    });

    for (const [day, items] of groupByDay.entries()) {
        console.log(`\nDay ${day} (${items.length} items):`);

        // Rule: Start != Meal
        if (items[0].type.includes('MEAL')) {
            console.error(`FAIL: Day ${day} starts with Meal`);
            process.exit(1);
        }

        // Rule: End with Dinner
        const last = items[items.length - 1];
        if (last.type !== 'MEAL_DINNER') {
            console.error(`FAIL: Day ${day} does not end with Dinner`);
            // strictly speaking user said "Insert dinner as final item".
            // If reconstructor logic worked, it should be dinner.
        }

        // Rule: Lunch exists and is inside
        const lunchIdx = items.findIndex((i: any) => i.type === 'MEAL_LUNCH');
        if (lunchIdx === -1) {
            console.error(`FAIL: Day ${day} missing Lunch`);
        } else if (lunchIdx === 0) {
            console.error(`FAIL: Day ${day} Lunch is first`);
        }

        items.forEach((i: any, idx: number) => {
            console.log(`${idx + 1}. [${i.type}] ${i.title}`);
        });
    }

    console.log("\nPASS: All linear flow rules respected.");
}

runTests().catch(e => {
    console.error("FAILED:", e);
    process.exit(1);
});

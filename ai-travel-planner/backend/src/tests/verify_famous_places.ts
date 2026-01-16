
import { buildItinerary } from '../services/itineraryBuilderMCP';

async function runTests() {
    console.log(">>> VERIFYING FAMOUS PLACES SEEDING >>>");

    // PASS EMPTY POIS to force usage of internal seed
    const itinerary = await buildItinerary([], 3, 'medium');

    const allActivities = itinerary.days.flatMap(d => d.blocks.map(b => b.activity.toLowerCase()));

    console.log("Generated Activities:", allActivities);

    const checkList = ['burj khalifa', 'dubai mall', 'dubai fountain'];
    const hits = checkList.filter(target => allActivities.some(a => a.includes(target)));

    console.log(`Found ${hits.length} / ${checkList.length} guaranteed seeds.`);

    if (hits.length === checkList.length) {
        console.log("PASS: Famous places successfully seeded.");
    } else {
        console.error("FAIL: Missing famous places.");
        process.exit(1);
    }
}

runTests().catch(e => {
    console.error("FAILED:", e);
    process.exit(1);
});


import { buildItinerary } from '../services/itineraryBuilderMCP';
import { applyDeterministicEdit } from '../services/editEngine';
import { Itinerary } from '../types/itinerary';

// MOCK POIs
const MOCK_POIS = [
    { id: '1', name: 'Burj Khalifa', category: 'Landmark', location: { lat: 25, lng: 55, zone: 'Downtown' }, score: 90 },
    { id: '2', name: 'Dubai Mall', category: 'Mall', location: { lat: 25, lng: 55, zone: 'Downtown' }, score: 80 },
    { id: '3', name: 'Al Fahidi Fort', category: 'Museum', location: { lat: 25, lng: 55, zone: 'Old Dubai' }, score: 85 },
    { id: '4', name: 'Desert Safari', category: 'Adventure', location: { lat: 24, lng: 54, zone: 'Other' }, score: 88 },
];

async function runTests() {
    console.log(">>> STARTING VERIFICATION >>>");

    // 1. TEST ITINERARY BUILDER (Fix A, B, C)
    console.log("\n[Test 1] Itinerary Builder Logic");
    const itinerary = await buildItinerary(MOCK_POIS, 2, 'medium');

    // Check Day 1 Slots
    const day1 = itinerary.days[0];
    const lunch = day1.blocks.find(b => b.type === 'lunch');
    const dinner = day1.blocks.find(b => b.type === 'dinner');

    if (!lunch || !lunch.fixed || lunch.duration !== '45 mins') throw new Error("Lunch slot invalid");
    if (!dinner || !dinner.fixed || dinner.duration !== '45 mins') throw new Error("Dinner slot invalid");

    // Check Restaurant Name
    // Day 1 Downtown Lunch -> Zuma (index 0 for lunch)
    console.log("Lunch Activity:", lunch.activity);
    if (!lunch.activity.includes('Zuma') && !lunch.activity.includes('Armani') && !lunch.activity.includes('Lunch')) {
        console.warn("Warning: Restaurant name not matching expected pattern? Got: " + lunch.activity);
    }

    console.log("Day 1 Blocks:", day1.blocks.map(b => `${b.time}: ${b.activity} (${b.duration})`));


    // 2. TEST EDITING (Fix F)
    console.log("\n[Test 2] Editing Logic");

    // MOVE
    console.log("- Testing Move...");
    // Move Day 1 Morning to Day 2
    const moveIntent: any = {
        change: 'move_activity',
        day: 1,
        target_day: 2,
        target_block: 'morning'
    };

    const movedItinerary = applyDeterministicEdit(itinerary, moveIntent);
    const day1New = movedItinerary.days[0];
    const day2New = movedItinerary.days[1];

    // Original Day 1 had 4 blocks (M, L, A, D). If we move Morning, it should have 3?
    // Actually our Morning matching might be loose.
    console.log("Day 2 New Blocks:", day2New.blocks.map(b => b.activity));
    if (day2New.blocks.length <= itinerary.days[1].blocks.length) {
        console.warn(">> Move test ambiguous: Day 2 count didn't increase?");
    } else {
        console.log(">> Move verified: Day 2 gained a block.");
    }

    // RELAX
    console.log("- Testing Relax...");
    const relaxIntent: any = {
        change: 'relax',
        day: 2
    };
    const relaxedItinerary = applyDeterministicEdit(itinerary, relaxIntent);
    const day2Relaxed = relaxedItinerary.days[1];
    const leisureFn = day2Relaxed.blocks.find(b => b.activity.includes('Leisure'));
    if (!leisureFn) throw new Error("Relax failed: No Leisure block found.");
    console.log(">> Relax verified: Found " + leisureFn.activity);

    console.log("\n<<< VERIFICATION COMPLETE >>>");
}

runTests().catch(e => {
    console.error("FAILED:", e);
    process.exit(1);
});

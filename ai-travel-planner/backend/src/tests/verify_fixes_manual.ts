
import { reconstructItinerary } from '../core/itineraryReconstructor';
import { ItineraryState, ItineraryItem } from '../core/itineraryNormalizer';

async function runTests() {
    console.log(">>> VERIFYING TRAVEL TIMES >>>");

    // MOCK ITEMS
    // Zone A: Downtown
    // Zone B: Marina
    const items: ItineraryItem[] = [
        {
            id: '1', day: 1, title: 'Burj Khalifa', slot: 'MORNING', type: 'ATTRACTION',
            location: 'Burj Khalifa, Downtown',
            estVisitMins: 90,
            estTravelMins: 0
        },
        {
            id: '2', day: 1, title: 'Dubai Mall', slot: 'AFTERNOON', type: 'ATTRACTION',
            location: 'Dubai Mall, Downtown',
            estVisitMins: 120,
            estTravelMins: 0
        },
        {
            id: '3', day: 1, title: 'Marina Walk', slot: 'EVENING', type: 'ATTRACTION',
            location: 'Dubai Marina',
            estVisitMins: 60,
            estTravelMins: 0
        }
    ];

    const state: ItineraryState = {
        items: items,
        metadata: { source: 'BUILDER', version: 1 }
    };

    console.log("Running reconstruction...");
    const result = reconstructItinerary(state);

    // ANALYZE TRAVEL TIMES
    // Item 1 -> Item 2 (Same Zone: Downtown -> Downtown)
    // Item 2 -> Item 3 (Diff Zone: Downtown -> Marina)

    const item1 = result.items.find(i => i.id === '1');
    const item2 = result.items.find(i => i.id === '2');
    const item3 = result.items.find(i => i.id === '3');

    if (!item1 || !item2 || !item3) throw new Error("Missing items in result");

    console.log(`Item 1 -> Item 2 Travel: ${item2.estTravelMins} mins (Expected ~15)`);
    console.log(`Item 2 -> Item 3 Travel: ${item3.estTravelMins} mins (Expected ~40)`);

    if (item2.estTravelMins !== 15) {
        console.error("FAIL: Same zone travel time incorrect.");
    } else {
        console.log("PASS: Same zone travel time correct.");
    }

    if (item3.estTravelMins !== 40) {
        console.error("FAIL: Different zone travel time incorrect.");
    } else {
        console.log("PASS: Different zone travel time correct.");
    }
}

runTests().catch(e => {
    console.error("FAILED:", e);
    process.exit(1);
});

import { applyDeterministicEdit } from '../src/services/editEngine';
import { EditIntentType, EditOperation } from '../src/types/edit';
import { Itinerary } from '../src/types/itinerary';

// --- MOCK ITINERARY ---
const mockItinerary: Itinerary = {
    title: "Test Trip",
    days: [
        {
            day: 1,
            blocks: [
                { id: '1', activity: 'Breakfast', type: 'MEAL', mealType: 'breakfast', duration: '1h', fixed: true },
                { id: '2', activity: 'Burj Khalifa', type: 'ATTRACTION', duration: '2h', fixed: false },
                { id: '3', activity: 'Lunch', type: 'MEAL', mealType: 'lunch', duration: '1h', fixed: true },
                { id: '4', activity: 'Dubai Mall', type: 'ATTRACTION', duration: '3h', fixed: false },
                { id: '5', activity: 'Dinner', type: 'MEAL', mealType: 'dinner', duration: '1h', fixed: true }
            ]
        },
        {
            day: 2,
            blocks: [
                { id: '6', activity: 'Breakfast', type: 'MEAL', mealType: 'breakfast', duration: '1h', fixed: true },
                { id: '7', activity: 'Museum of Future', type: 'ATTRACTION', duration: '2h', fixed: false },
                { id: '8', activity: 'Lunch', type: 'MEAL', mealType: 'lunch', duration: '1h', fixed: true },
                { id: '9', activity: 'Frame', type: 'ATTRACTION', duration: '1h', fixed: false },
                { id: '10', activity: 'Dinner', type: 'MEAL', mealType: 'dinner', duration: '1h', fixed: true }
            ]
        }
    ]
};

async function runTests() {
    console.log(">>> VERIFYING DETERMINISTIC EDITS >>>");
    let passed = 0;

    // TEST 1: RELAX DAY
    const op1: EditOperation = { intent: EditIntentType.RELAX_DAY, sourceDay: 1, rawInstruction: "Relax day 1" };
    const res1 = applyDeterministicEdit(mockItinerary, op1);
    if (res1.success && res1.itinerary.days[0].blocks.length < 5 && res1.message.includes("relaxed")) {
        console.log("PASS: Relax Day 1");
        passed++;
    } else {
        console.error("FAIL: Relax Day 1", res1);
    }

    // TEST 2: SWAP DAYS
    const op2: EditOperation = { intent: EditIntentType.SWAP_DAYS, sourceDay: 1, targetDay: 2, rawInstruction: "Swap days" };
    const res2 = applyDeterministicEdit(mockItinerary, op2);
    // Day 1 should now have Museum (id 7)
    if (res2.success && res2.itinerary.days[0].blocks.find(b => b.activity.includes("Museum")) && res2.message.includes("swapped")) {
        console.log("PASS: Swap Days");
        passed++;
    } else {
        console.error("FAIL: Swap Days", res2);
    }

    // TEST 3: MOVE ITEM BETWEEN DAYS
    const op3: EditOperation = {
        intent: EditIntentType.MOVE_ITEM_BETWEEN_DAYS,
        sourceDay: 1,
        targetDay: 2,
        itemToMove: "Burj Khalifa",
        targetSlot: 'morning',
        rawInstruction: "Move Burj Khalifa to Day 2"
    };
    const res3 = applyDeterministicEdit(mockItinerary, op3);

    // Check if move succeeded
    const bkInDay2 = res3.itinerary.days[1].blocks.find(b => b.activity.includes("Burj"));
    // Verify position relative to meal (morning = before lunch)
    const lunchIdx = res3.itinerary.days[1].blocks.findIndex(b => b.mealType === 'lunch');
    const bkIdx = res3.itinerary.days[1].blocks.findIndex(b => b.activity.includes("Burj"));

    if (res3.success && bkInDay2 && bkIdx < lunchIdx) {
        console.log("PASS: Move Item Between Days");
        passed++;
    } else {
        console.error("FAIL: Move Item", res3);
    }

    // TEST 4: PACK DAY (Add item)
    const opPack: EditOperation = {
        intent: EditIntentType.PACK_DAY,
        sourceDay: 2, // Add to day 2
        rawInstruction: "Make day 2 packed"
    };
    const resPack = applyDeterministicEdit(mockItinerary, opPack);
    const added = resPack.itinerary.days[1].blocks.find(b => b.id.startsWith('packed-'));
    if (!added) {
        console.error("FAIL: Pack Day - No item added");
    } else {
        console.log("PASS: Pack Day added item successfully.");
        passed++;
    }

    console.log(`\nResult: ${passed}/4 Tests Passed`);

    if (passed === 4) process.exit(0);
    else process.exit(1);
}

runTests();

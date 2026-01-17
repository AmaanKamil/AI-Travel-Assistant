import { applyDeterministicEdit } from '../src/services/editEngine';
import { EditIntentType, EditOperation } from '../src/types/edit';
import { Itinerary, TimeBlock } from '../src/types/itinerary';

// MOCK ITINERARY
const mockItinerary: Itinerary = {
    title: "Test Trip",
    days: [
        {
            day: 1,
            blocks: [
                { id: 'b1', activity: 'Morning Walk', type: 'ATTRACTION', slot: 'morning', fixed: false },
                { id: 'l1', activity: 'Lunch at Zuma', type: 'MEAL', mealType: 'lunch', slot: 'afternoon', fixed: true, cuisine: 'Japanese' },
                { id: 'b2', activity: 'Visit Burj Khalifa', type: 'ATTRACTION', slot: 'afternoon', fixed: false, description: 'Tallest building' },
                { id: 'd1', activity: 'Dinner at Prime68', type: 'MEAL', mealType: 'dinner', slot: 'evening', fixed: true, cuisine: 'Steakhouse' }
            ]
        },
        {
            day: 2,
            blocks: [
                { id: 'b3', activity: 'Dubai Mall', type: 'ATTRACTION', slot: 'morning', fixed: false },
                { id: 'l2', activity: 'Lunch at Fife', type: 'MEAL', mealType: 'lunch', slot: 'afternoon', fixed: true },
                { id: 'd2', activity: 'Dinner at Sea Fu', type: 'MEAL', mealType: 'dinner', slot: 'evening', fixed: true }
            ]
        }
    ]
};

function runTests() {
    console.log(">>> VERIFYING EDIT ENGINE >>>");
    let errors = 0;

    // TEST 1: RELAX DAY 1
    // Should remove 'Visit Burj Khalifa' or 'Morning Walk' (last non-meal attraction usually)
    const opRelax: EditOperation = {
        intent: EditIntentType.RELAX_DAY,
        sourceDay: 1,
        rawInstruction: "Relax day 1"
    };
    const resRelax = applyDeterministicEdit(mockItinerary, opRelax);
    if (resRelax.days[0].blocks.length !== 3) {
        console.error("FAIL: Relax Day 1 - Expected 3 blocks, got", resRelax.days[0].blocks.length);
        errors++;
    } else {
        console.log("PASS: Relax Day 1 removed an item.");
    }

    // TEST 2: SWAP DAYS
    const opSwap: EditOperation = {
        intent: EditIntentType.SWAP_DAYS,
        sourceDay: 1,
        targetDay: 2,
        rawInstruction: "Swap day 1 and 2"
    };
    const resSwap = applyDeterministicEdit(mockItinerary, opSwap);
    if (resSwap.days[0].blocks[0].activity !== 'Dubai Mall') {
        console.error("FAIL: Swap Days - Day 1 does not start with Dubai Mall");
        errors++;
    } else {
        console.log("PASS: Swap Days successful.");
    }

    // TEST 3: MOVE ITEM BETWEEN DAYS
    const opMove: EditOperation = {
        intent: EditIntentType.MOVE_ITEM_BETWEEN_DAYS,
        sourceDay: 1,
        targetDay: 2,
        itemToMove: "Burj Khalifa",
        targetSlot: 'morning',
        rawInstruction: "Move Burj Khalifa to Day 2"
    };
    const resMove = applyDeterministicEdit(mockItinerary, opMove);
    const inDay1 = resMove.days[0].blocks.find(b => b.activity.includes('Burj'));
    const inDay2 = resMove.days[1].blocks.find(b => b.activity.includes('Burj'));

    if (inDay1) {
        console.error("FAIL: Move Item - Item still in source day");
        errors++;
    }
    if (!inDay2) {
        console.error("FAIL: Move Item - Item not found in target day");
        errors++;
    }
    const inDay2Idx = resMove.days[1].blocks.findIndex(b => b.activity.includes('Burj'));
    const lunch2Idx = resMove.days[1].blocks.findIndex(b => b.mealType === 'lunch');

    if (inDay1) {
        console.error("FAIL: Move Item - Item still in source day");
        errors++;
    }
    if (inDay2Idx === -1) {
        console.error("FAIL: Move Item - Item not found in target day");
        errors++;
    }
    // Verify it is BEFORE lunch (Morning)
    if (inDay2Idx > -1 && lunch2Idx > -1 && inDay2Idx >= lunch2Idx) {
        console.error("FAIL: Move Item - Item is NOT before lunch (Morning)", inDay2Idx, lunch2Idx);
        errors++;
    }
    if (!inDay1 && inDay2Idx > -1 && (lunch2Idx === -1 || inDay2Idx < lunch2Idx)) {
        console.log("PASS: Move Item successful (Placed in Morning slot).");
    }

    // TEST 4: PACK DAY (Add item)
    const opPack: EditOperation = {
        intent: EditIntentType.PACK_DAY,
        sourceDay: 2, // Add to day 2
        rawInstruction: "Make day 2 packed"
    };
    const resPack = applyDeterministicEdit(mockItinerary, opPack);
    const added = resPack.days[1].blocks.find(b => b.id.startsWith('packed-'));
    if (!added) {
        console.error("FAIL: Pack Day - No item added");
        errors++;
    } else {
        console.log("PASS: Pack Day added item successfully.");
    }

    if (errors === 0) {
        console.log("\n>>> ALL TESTS PASSED <<<");
        process.exit(0);
    } else {
        console.error(`\n>>> ${errors} TESTS FAILED <<<`);
        process.exit(1);
    }
}

runTests();

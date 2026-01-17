
import { handleUserInput } from '../src/orchestrator/orchestrator';
import { createNewSession } from '../src/orchestrator/sessionContext';

async function runTest() {
    const sessionId = 'test-session-' + Date.now();
    console.log(`>>> STARTING PLANNING FLOW TEST (Session: ${sessionId}) >>>`);

    // 1. Start Conversation
    console.log("\n[User]: Hi");
    await handleUserInput(sessionId, "Hi");

    // 2. Provide Partial Info (Days only)
    console.log("\n[User]: I want a 3 day trip.");
    const res1 = await handleUserInput(sessionId, "I want a 3 day trip.");
    console.log(`[Bot]: ${res1.message}`);

    // 3. Try to Force Generate (Should Block)
    console.log("\n[User]: Go ahead and generate.");
    const res2 = await handleUserInput(sessionId, "Go ahead and generate.");
    console.log(`[Bot]: ${res2.message}`);

    if (res2.message.includes("One more thing") || res2.message.includes("tell me what you enjoy")) {
        console.log("PASS: Blocked generation and asked clarifying question.");
    } else {
        console.error("FAIL: Did not block generation correctly.");
        console.error("Got:", res2.message);
        process.exit(1);
    }

    // 4. Provide Interest
    console.log("\n[User]: I like food and beaches.");
    const res3 = await handleUserInput(sessionId, "I like food and beaches.");
    console.log(`[Bot]: ${res3.message}`);

    // 5. Try to Generate Again (Should Block on Pace)
    console.log("\n[User]: Generate now.");
    const res4 = await handleUserInput(sessionId, "Generate now.");
    console.log(`[Bot]: ${res4.message}`);

    if (res4.message.includes("pace") || res4.message.includes("schedule")) {
        console.log("PASS: Blocked generation and asked for pace.");
    } else {
        console.error("FAIL: Did not ask for pace.");
        console.error("Got:", res4.message);
        process.exit(1);
    }

    console.log("\n>>> ALL TESTS PASSED <<<");
}

runTest();

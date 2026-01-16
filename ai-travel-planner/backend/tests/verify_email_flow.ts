
import axios from 'axios';

async function runTest() {
    console.log(">>> VERIFYING ASYNC EMAIL API >>>");
    const URL = "http://localhost:3000/api/send-itinerary-email";

    // Mock Itinerary
    const mockItin = { title: "Test Trip", days: [{ activities: [] }] };

    // 1. Missing Data Test
    try {
        console.log("1. Testing Missing Data...");
        await axios.post(URL, {});
        console.error("FAIL: Should have 400'd");
    } catch (e: any) {
        if (e.response && e.response.status === 400) console.log("PASS: Got 400 for missing data.");
        else console.error("FAIL: Unexpected error", e.message);
    }

    // 2. Invalid Itinerary Test (Empty Days)
    try {
        console.log("2. Testing Invalid Itinerary (Empty Days)...");
        await axios.post(URL, { email: "test@example.com", itinerary: { title: "Empty", days: [] } });
        console.error("FAIL: Should have 400'd for empty days");
    } catch (e: any) {
        if (e.response && e.response.status === 400 && e.response.data.error === "ITINERARY_MISSING") {
            console.log("PASS: Got 400 for empty days.");
        } else {
            console.error("FAIL: Unexpected result", e.response?.data || e.message);
        }
    }

    // 3. Valid Mock Send (Async)
    try {
        console.log("3. Testing Valid Mock Send (Async)...");
        const startTime = Date.now();
        const res = await axios.post(URL, { email: "test@example.com", itinerary: mockItin });
        const duration = Date.now() - startTime;

        if (duration < 500 && res.data.success && res.data.status === "QUEUED") {
            console.log(`PASS: Response received in ${duration}ms with status: QUEUED.`);
        } else {
            console.error(`FAIL: Stats mismatch. Duration: ${duration}ms, Body:`, res.data);
        }
    } catch (e: any) {
        console.error("FAIL: API crashed", e.message);
        if (e.code === 'ECONNREFUSED') console.error("Make sure the backend server is running on port 3000!");
        else console.error(JSON.stringify(e.response?.data || {}, null, 2));
    }
}

runTest();

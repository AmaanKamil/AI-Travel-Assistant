
import axios from 'axios';

async function runTest() {
    console.log(">>> VERIFYING GMAIL SMTP DELIVERY API >>>");
    const URL = "http://localhost:3000/api/send-itinerary-email";

    // Mock Itinerary
    const mockItin = { title: "Test Trip", days: [{ blocks: [{ activity: "Burj Khalifa", duration: "2h" }] }] };

    // 1. Missing Data Test
    try {
        console.log("1. Testing Missing Data...");
        await axios.post(URL, {});
        console.error("FAIL: Should have 400'd");
    } catch (e: any) {
        if (e.response) {
            console.log(`PASS: Got ${e.response.status} for missing data.`);
        } else {
            console.error("FAIL: No response for missing data:", e.message);
        }
    }

    // 2. Invalid Itinerary Test (Empty Days)
    try {
        console.log("2. Testing Invalid Itinerary (Empty Days)...");
        await axios.post(URL, { email: "test@example.com", itinerary: { title: "Empty", days: [] } });
        console.error("FAIL: Should have 400'd for empty days");
    } catch (e: any) {
        if (e.response) {
            console.log(`PASS: Got ${e.response.status} for empty days. Error: ${e.response.data.error}`);
        } else {
            console.error("FAIL: No response for empty days:", e.message);
        }
    }

    // 3. Valid Send (Sync/Await)
    try {
        console.log("3. Testing Valid Send (Sanity Check - Non-Gmail)...");
        // Sending to a non-gmail address to distinguish filtering
        const res = await axios.post(URL, { email: "verify_delivery_test@outlook.com", itinerary: mockItin });
        const data = res.data as any;
        if (data.success) {
            console.log("PASS: Email accepted by provider.");
        } else {
            console.error("FAIL: Success was false", data);
        }
    } catch (e: any) {
        if (e.response) {
            console.error(`FAIL: API returned ${e.response.status}`, e.response.data);
        } else {
            console.error("FAIL: Request failed", e.message);
        }
    }
}

runTest();

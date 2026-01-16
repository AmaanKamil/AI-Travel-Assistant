
import axios from 'axios';

async function runTest() {
    console.log(">>> VERIFYING EMAIL API RELIABILITY >>>");
    const URL = "http://localhost:3000/api/send-itinerary-email";

    // Mock Itinerary
    const mockItin = { title: "Test Trip", days: [] };

    // 1. Missing Data Test
    try {
        console.log("1. Testing Missing Data...");
        await axios.post(URL, {});
        console.error("FAIL: Should have 400'd");
    } catch (e: any) {
        if (e.response && e.response.status === 400) console.log("PASS: Got 400 for missing data.");
        else console.error("FAIL: Unexpected error", e.message);
    }

    // 2. Invalid Email Test
    try {
        console.log("2. Testing Invalid Email...");
        await axios.post(URL, { email: "not-an-email", itinerary: mockItin });
        console.error("FAIL: Should have 400'd");
    } catch (e: any) {
        if (e.response && e.response.status === 400) console.log("PASS: Got 400 for invalid email.");
        else console.error("FAIL: Unexpected error", e.message);
    }

    // 3. Valid Mock Send
    try {
        console.log("3. Testing Valid Mock Send...");
        const res = await axios.post(URL, { email: "test@example.com", itinerary: mockItin });
        if (res.data.success) console.log("PASS: Success response received.");
        else console.error("FAIL: Success was false", res.data);
    } catch (e: any) {
        console.error("FAIL: API crashed", e.message);
        if (e.code === 'ECONNREFUSED') console.error("Make sure the backend server is running on port 3000!");
        else console.error(JSON.stringify(e.response?.data || {}, null, 2));
    }
}

runTest();

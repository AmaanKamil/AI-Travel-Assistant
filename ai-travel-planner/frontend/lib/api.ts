import axios from "axios";

// Allow configuring base URL via env, default to localhost:3000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface OrchestrateResponse {
    message: string;
    itinerary?: any; // We can type this strictly later
    error?: string;
}

export const orchestrateTrip = async (sessionId: string, transcript: string): Promise<OrchestrateResponse> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/orchestrate`, {
            sessionId,
            transcript,
        });
        return response.data;
    } catch (error: any) {
        console.error("API Error:", error);
        return {
            message: "Sorry, I encountered an error connecting to the planner.",
            error: error.message
        };
    }
};

export const exportItinerary = async (itinerary: any, userEmail: string): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/export-itinerary`, {
            itinerary,
            userEmail
        });
        return { success: true, message: response.data.message };
    } catch (error: any) {
        console.error("Export Error:", error);
        return {
            success: false,
            message: error.response?.data?.error || "Failed to send email."
        };
    }
};

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

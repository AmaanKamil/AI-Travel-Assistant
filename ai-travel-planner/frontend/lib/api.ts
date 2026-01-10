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
        const serverError = error.response?.data?.error;
        return {
            message: serverError || "Sorry, I encountered an unexpected error. Please try again.",
            error: serverError || error.message
        };
    }
};

export const editItinerary = async (sessionId: string, editCommand: string): Promise<OrchestrateResponse> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/edit-itinerary`, {
            sessionId,
            editCommand
        });
        return {
            message: response.data.message,
            itinerary: response.data.updatedItinerary,
            audio: response.data.audio,
            error: response.data.status === 'error' ? response.data.message : undefined
        } as any;
    } catch (error: any) {
        console.error("Edit API Error:", error);
        return {
            message: error.response?.data?.message || "Sorry, I couldn't make those changes.",
            error: error.response?.data?.message || error.message
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

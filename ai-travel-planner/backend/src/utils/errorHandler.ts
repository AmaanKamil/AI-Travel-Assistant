export interface AppError {
    status: 'error';
    userMessage: string;
    debugId: string;
    originalError?: any;
}

export function handleError(originalError: any, contextStr: string, customUserMessage?: string): AppError {
    const debugId = `ERR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    console.error(`[${debugId}] Error in ${contextStr}:`, originalError);

    // Default friendly message
    let userMessage = "Something went wrong while processing your request. Please try again.";

    // Use custom message if provided
    if (customUserMessage) {
        userMessage = customUserMessage;
    } else if (originalError instanceof Error) {
        // Here we could map specific error types to messages if we had custom error classes
        // For now, we prefer the generic safe message unless it's a known safe error to show
        if (originalError.message.includes("No itinerary details")) {
            userMessage = "I couldn't generate the PDF because the itinerary seems empty.";
        }
    }

    return {
        status: 'error',
        userMessage,
        debugId,
        originalError
    };
}

export async function getGroundedAnswer(query: string): Promise<{ answer: string; citations: string[] }> {
    console.log(`[RAG Service] Searching for: "${query}"`);
    return {
        answer: "Dubai offers a blend of modern marvels and traditional heritage. The Burj Khalifa is a must-visit for panoramic views, while Al Fahidi offers a glimpse into the past.",
        citations: [
            "Wikivoyage: Dubai/Downtown",
            "OpenStreetMap: Way 123456"
        ]
    };
}

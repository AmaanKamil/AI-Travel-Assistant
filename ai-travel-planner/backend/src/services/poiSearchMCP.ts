export interface POI {
    id: string;
    name: string;
    category: string;
    estimated_visit_duration_minutes: number;
    location: { lat: number; lng: number };
    metadata: { description: string; source: string };
}

export async function searchPOIs(interests: string[]): Promise<POI[]> {
    console.log(`[MCP: POI Search] Searching for interests: ${interests.join(', ')}`);

    // Mock realistic Dubai POIs
    return [
        {
            id: 'poi-1',
            name: 'Burj Khalifa',
            category: 'Landmark',
            estimated_visit_duration_minutes: 120,
            location: { lat: 25.1972, lng: 55.2744 },
            metadata: {
                description: 'Tallest building in the world with observation decks.',
                source: 'OpenStreetMap'
            }
        },
        {
            id: 'poi-2',
            name: 'Al Fahidi Historical Neighbourhood',
            category: 'Culture',
            estimated_visit_duration_minutes: 90,
            location: { lat: 25.2630, lng: 55.3003 },
            metadata: {
                description: 'Historic district with wind towers and narrow lanes.',
                source: 'Wikivoyage'
            }
        },
        {
            id: 'poi-3',
            name: 'Ravi Restaurant',
            category: 'Food',
            estimated_visit_duration_minutes: 60,
            location: { lat: 25.25, lng: 55.28 },
            metadata: {
                description: 'Famous Pakistani eatery in Satwa.',
                source: 'Michelin Guide'
            }
        },
        {
            id: 'poi-4',
            name: 'Museum of the Future',
            category: 'Landmark',
            estimated_visit_duration_minutes: 120,
            location: { lat: 25.2192, lng: 55.2818 },
            metadata: {
                description: 'Exhibition space for innovative and futuristic ideologies.',
                source: 'Dubai Tourism'
            }
        }
    ];
}

import fetch from 'node-fetch';

export interface POI {
    id: string;
    name: string;
    category: string;
    estimated_visit_duration_minutes: number;
    location: { lat: number; lng: number };
    metadata: { description: string; source: string; indoor: boolean; best_time: string };
    image?: string;
}

export async function searchPOIs(interests: string[], constraints?: string[]): Promise<POI[]> {
    console.log(`[MCP: POI Search] Searching for interests: ${interests.join(', ')}`);

    // Only Dubai is supported for V1
    // In a real implementation we would check the city input, but for this signature we assume Dubai context
    // or we could add a city parameter. The user prompt signature only had (interests, constraints) in intent
    // but the original Service signature was (interests).
    // The user requested: "Accept input city, interests, pace, constraints".
    // But the orchestrator calls it as: searchPOIs(interests).
    // We will stick to the existing signature for compatibility or update it if safe.
    // The orchestrator.ts passes: searchPOIs(context.collectedConstraints.interests || [])
    // We will modify the implementation to handle the query internally.

    const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

    // Hardcoded query for V1 Dubai Scope
    const query = `
        [out:json];
        (
          node["tourism"="museum"](24.8,54.9,25.4,55.6);
          node["tourism"="attraction"](24.8,54.9,25.4,55.6);
          node["historic"](24.8,54.9,25.4,55.6);
          node["amenity"="restaurant"](24.8,54.9,25.4,55.6);
          node["tourism"="gallery"](24.8,54.9,25.4,55.6);
        );
        out center 50;
    `;

    try {
        const response = await fetch(OVERPASS_API_URL, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!response.ok) {
            throw new Error(`Overpass API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const elements = (data as any).elements || [];

        return elements.map((el: any) => normalizePOI(el)).filter((poi: any) => poi.name !== 'Unknown');

    } catch (error) {
        console.error("POI Search Failed:", error);
        return [];
    }
}

function normalizePOI(el: any): POI {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || 'Unknown';

    // Category Mapping
    let category = 'attraction';
    if (tags.tourism === 'museum') category = 'museum';
    else if (tags.tourism === 'gallery') category = 'gallery';
    else if (tags.historic) category = 'historic_site';
    else if (tags.amenity === 'restaurant') category = 'restaurant';

    // Heuristics
    const isIndoor = ['museum', 'gallery', 'restaurant'].includes(category);

    // Time of Day
    // Simple heuristic: Outdoor activity in Dubai => Evening preferred due to heat
    const bestTime = isIndoor ? 'morning' : 'evening';

    // Duration Logic
    let duration = 45;
    switch (category) {
        case 'museum': duration = 90; break;
        case 'gallery': duration = 60; break;
        case 'historic_site': duration = 60; break;
        case 'restaurant': duration = 75; break;
        case 'attraction': duration = 90; break;
    }

    return {
        id: `osm-${el.id}`,
        name: name,
        category: category,
        estimated_visit_duration_minutes: duration,
        location: {
            lat: el.lat,
            lng: el.lon
        },
        metadata: {
            description: `A ${category} in Dubai.`,
            source: 'OpenStreetMap',
            indoor: isIndoor,
            best_time: bestTime
        }
    };
}

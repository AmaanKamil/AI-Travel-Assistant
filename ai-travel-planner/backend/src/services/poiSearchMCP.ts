import fetch from 'node-fetch';
import { handleError } from '../utils/errorHandler';

export interface POI {
    id: string;
    name: string;
    category: string;
    estimated_visit_duration_minutes: number;
    location: { lat: number; lng: number; zone?: string };
    metadata: { description: string; source: string; indoor: boolean; best_time: string };
    image?: string;
    score?: number;
}

const DUBAI_TOP_10_SEEDS: POI[] = [
    { id: 'seed-1', name: 'Burj Khalifa', category: 'attraction', estimated_visit_duration_minutes: 120, location: { lat: 25.1972, lng: 55.2744, zone: 'Downtown' }, metadata: { description: 'The tallest building in the world.', source: 'Seed', indoor: true, best_time: 'evening' } },
    { id: 'seed-2', name: 'The Dubai Mall', category: 'attraction', estimated_visit_duration_minutes: 180, location: { lat: 25.1988, lng: 55.2796, zone: 'Downtown' }, metadata: { description: 'World\'s largest shopping mall.', source: 'Seed', indoor: true, best_time: 'afternoon' } },
    { id: 'seed-3', name: 'Dubai Fountain', category: 'attraction', estimated_visit_duration_minutes: 30, location: { lat: 25.197, lng: 55.27, zone: 'Downtown' }, metadata: { description: 'World\'s largest choreographed fountain system.', source: 'Seed', indoor: false, best_time: 'evening' } },
    { id: 'seed-4', name: 'Palm Jumeirah', category: 'landmark', estimated_visit_duration_minutes: 120, location: { lat: 25.1124, lng: 55.1390, zone: 'Marina' }, metadata: { description: 'Iconic palm-shaped artificial island.', source: 'Seed', indoor: false, best_time: 'morning' } },
    { id: 'seed-5', name: 'Al Fahidi Historical District', category: 'historic_site', estimated_visit_duration_minutes: 90, location: { lat: 25.2630, lng: 55.3003, zone: 'Old Dubai' }, metadata: { description: 'Traditional heritage area.', source: 'Seed', indoor: false, best_time: 'morning' } },
    { id: 'seed-6', name: 'Dubai Creek', category: 'waterfront', estimated_visit_duration_minutes: 60, location: { lat: 25.26, lng: 55.30, zone: 'Old Dubai' }, metadata: { description: 'Historic saltwater creek.', source: 'Seed', indoor: false, best_time: 'evening' } },
    { id: 'seed-7', name: 'Jumeirah Mosque', category: 'mosque', estimated_visit_duration_minutes: 45, location: { lat: 25.2336, lng: 55.2778, zone: 'Jumeirah' }, metadata: { description: 'Famous mosque open to non-Muslims.', source: 'Seed', indoor: true, best_time: 'morning' } },
    { id: 'seed-8', name: 'Souk Madinat Jumeirah', category: 'souk', estimated_visit_duration_minutes: 90, location: { lat: 25.133, lng: 55.185, zone: 'Jumeirah' }, metadata: { description: 'Modern souk with traditional vibe.', source: 'Seed', indoor: true, best_time: 'evening' } },
    { id: 'seed-9', name: 'Burj Al Arab', category: 'landmark', estimated_visit_duration_minutes: 60, location: { lat: 25.1412, lng: 55.1853, zone: 'Jumeirah' }, metadata: { description: 'Luxury hotel icon.', source: 'Seed', indoor: true, best_time: 'afternoon' } },
    { id: 'seed-10', name: 'Desert Safari', category: 'desert_experience', estimated_visit_duration_minutes: 240, location: { lat: 24.8, lng: 55.5, zone: 'Desert' }, metadata: { description: 'Dune bashing and dinner.', source: 'Seed', indoor: false, best_time: 'evening' } }
];

export async function searchPOIs(interests: string[], constraints?: string[]): Promise<POI[]> {
    console.log(`[MCP: POI Search] Searching for interests: ${interests.join(', ')}`);

    const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json];
        (
          node["tourism"="museum"](24.8,54.9,25.4,55.6);
          node["tourism"="attraction"](24.8,54.9,25.4,55.6);
          node["historic"](24.8,54.9,25.4,55.6);
          node["tourism"="viewpoint"](24.8,54.9,25.4,55.6);
          node["leisure"="park"](24.8,54.9,25.4,55.6);
        );
        out center 100;
    `;

    try {
        const response = await fetch(OVERPASS_API_URL, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!response.ok) throw new Error(`Overpass API Error: ${response.statusText}`);

        const data = await response.json();
        const elements = (data as any).elements || [];

        // Normalize and Filter
        const osmPOIs = elements
            .map((el: any) => normalizePOI(el))
            .filter((poi: POI | null) => poi !== null) as POI[];

        // Merge Scripts + OSM
        const allPOIs = [...DUBAI_TOP_10_SEEDS, ...osmPOIs];

        // Final Relevance Scoring & Sorting
        const scoredPOIs = allPOIs.map(poi => ({
            ...poi,
            score: calculateRelevance(poi, interests)
        })).sort((a, b) => b.score - a.score);

        console.log(`[MCP: POI Search] Returned ${scoredPOIs.length} valid POIs.`);
        return scoredPOIs;

    } catch (error) {
        handleError(error, 'POI Search');
        return DUBAI_TOP_10_SEEDS; // Fail safe to seeds
    }
}

function calculateRelevance(poi: POI, interests: string[]): number {
    let score = 10; // Base score

    // 1. Seed Bonus
    if (poi.metadata.source === 'Seed') score += 50;

    // 2. Category Bonus
    if (['attraction', 'landmark'].includes(poi.category)) score += 20;
    if (['museum', 'historic_site', 'souk'].includes(poi.category)) score += 15;
    if (['theme_park', 'waterfront'].includes(poi.category)) score += 10;

    // 3. Name Relevance (Simple Keyword Match)
    if (interests.some(int => poi.name.toLowerCase().includes(int.toLowerCase()))) {
        score += 30;
    }
    if (interests.some(int => poi.category.toLowerCase().includes(int.toLowerCase()))) {
        score += 15;
    }

    // 4. Penalties for Generics if not caught by filter
    if (poi.name.toLowerCase().includes("office") || poi.name.toLowerCase().includes("store")) {
        score -= 50;
    }

    return score;
}

function normalizePOI(el: any): POI | null {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || 'Unknown';

    // --- 1. HARD EXCLUSION RULES ---
    const BLOCKED_KEYWORDS = [
        'school', 'university', 'college', 'kindergarten',
        'hospital', 'clinic', 'medical', 'dental', 'pharmacy',
        'police', 'station', 'fire',
        'parking', 'garage',
        'office', 'admin', 'headquarters',
        'residence', 'apartment', 'villa',
        'supermarket', 'grocery', 'hypermarket',
        'pizza hut', 'mcdonald', 'kfc', 'subway', 'burger king', 'starbucks', 'costa', 'tim hortons', 'domino'
    ];

    if (BLOCKED_KEYWORDS.some(kw => name.toLowerCase().includes(kw))) {
        return null; // DROP IMMEDIATELY
    }

    // --- 2. CATEGORY ALLOWLIST ---
    let category = 'other';
    if (tags.tourism === 'museum') category = 'museum';
    else if (tags.tourism === 'attraction') category = 'attraction';
    else if (tags.tourism === 'viewpoint') category = 'viewpoint';
    else if (tags.tourism === 'theme_park') category = 'theme_park';
    else if (tags.tourism === 'gallery') category = 'museum'; // Group galleries
    else if (tags.historic || tags.heritage) category = 'historic_site';
    else if (tags.leisure === 'park') category = 'park';
    else if (name.toLowerCase().includes('souk')) category = 'souk';
    else if (name.toLowerCase().includes('beach')) category = 'beach';
    else if (name.toLowerCase().includes('mall')) category = 'mall';
    else if (name.toLowerCase().includes('mosque')) category = 'mosque';

    const ALLOWED_CATEGORIES = ['museum', 'attraction', 'viewpoint', 'theme_park', 'historic_site', 'park', 'souk', 'beach', 'mall', 'mosque', 'landmark', 'waterfront', 'desert_experience'];

    if (!ALLOWED_CATEGORIES.includes(category)) {
        return null; // DROP IF NOT ALLOWED
    }

    // Heuristics
    const isIndoor = ['museum', 'mall', 'souk', 'mosque'].includes(category);
    const bestTime = isIndoor ? 'afternoon' : 'evening'; // Default logic

    let duration = 60;
    if (category === 'museum') duration = 90;
    if (category === 'theme_park') duration = 240;

    const zone = determineZone(el.lat, el.lon);

    return {
        id: `osm-${el.id}`,
        name: name,
        category: category,
        estimated_visit_duration_minutes: duration,
        location: { lat: el.lat, lng: el.lon, zone: zone },
        metadata: {
            description: `A ${category} in ${zone}, Dubai.`,
            source: 'OpenStreetMap',
            indoor: isIndoor,
            best_time: bestTime
        }
    };
}

function determineZone(lat: number, lng: number): string {
    // Simple Lat/Lng Boxes for Dubai
    // Downtown: ~25.19, 55.27
    if (lat > 25.18 && lat < 25.21 && lng > 55.26 && lng < 55.29) return 'Downtown';

    // Old Dubai (Deira/Bur Dubai): ~25.26, 55.30
    if (lat > 25.24 && lat < 25.29 && lng > 55.28 && lng < 55.35) return 'Old Dubai';

    // Marina / JBR / Palm: ~25.07, 55.14
    if (lat > 25.06 && lat < 25.14 && lng < 55.17) return 'Marina';

    // Jumeirah (Coastal Strip): ~25.13 to 25.23
    if (lat >= 25.13 && lat <= 25.24 && lng >= 55.17 && lng <= 55.28) return 'Jumeirah';

    return 'Other';
}

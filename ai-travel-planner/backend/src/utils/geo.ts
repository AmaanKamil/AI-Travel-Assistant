export interface Coordinates {
    lat: number;
    lng: number;
}

/**
 * Calculates straight-line distance between two points in KM
 */
export function calculateHaversineDistance(
    loc1: Coordinates | undefined,
    loc2: Coordinates | undefined
): number | null {
    if (!loc1 || !loc2 || !loc1.lat || !loc1.lng || !loc2.lat || !loc2.lng) {
        return null;
    }

    const R = 6371; // Earth radius in km
    const dLat = toRad(loc2.lat - loc1.lat);
    const dLon = toRad(loc2.lng - loc1.lng);
    const lat1 = toRad(loc1.lat);
    const lat2 = toRad(loc2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(value: number): number {
    return value * Math.PI / 180;
}

/**
 * Maps distance (KM) to a taxi-based travel time range
 */
export function getWalkingOrTaxiTime(distanceKm: number): string {
    if (distanceKm < 0.5) return "5-10 mins walk";
    if (distanceKm < 3) return "10-20 mins by taxi";
    if (distanceKm < 8) return "15-30 mins by taxi";
    if (distanceKm < 15) return "25-45 mins by taxi";
    return "40-70 mins by taxi";
}

export function estimateTravelMins(
    fromArea: string,
    toArea: string
) {
    if (!fromArea || !toArea) return 0;
    if (fromArea === toArea) return 10;

    const matrix: Record<string, number> = {
        "Downtown-Marina": 25,
        "Marina-Downtown": 25,
        "Downtown-Jumeirah": 20,
        "Jumeirah-Downtown": 20,
        "Marina-Jumeirah": 15,
        "Jumeirah-Marina": 15,
        "Downtown-Old Dubai": 25,
        "Old Dubai-Downtown": 25,
        "Marina-Old Dubai": 40,
        "Old Dubai-Marina": 40
    };

    const key = `${fromArea}-${toArea}`;
    return matrix[key] ?? 30; // Default fallback
}

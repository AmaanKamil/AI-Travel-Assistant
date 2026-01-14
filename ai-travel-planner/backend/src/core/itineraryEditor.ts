import { ItineraryState } from "./itineraryNormalizer";

export function moveItemToDay(
    state: ItineraryState,
    itemId: string,
    newDay: number
): ItineraryState {
    // Deep clone to ensure immutability
    const items = state.items.map(i =>
        i.id === itemId ? { ...i, day: newDay } : i
    );

    return { items };
}

import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';

// Deterministic Edit Engine (No LLM)

export interface EditCommand {
    type: 'make_more_relaxed' | 'swap_activity' | 'unknown';
    targetDay: number;
    raw: string;
}

export function parseEditIntent(text: string): EditCommand {
    const lower = text.toLowerCase();

    // 1. Extract Day
    const dayMatch = lower.match(/day\s*(\d+)/);
    if (!dayMatch) {
        return { type: 'unknown', targetDay: 0, raw: text };
    }
    const targetDay = parseInt(dayMatch[1]);

    // 2. Extract Change Type
    if (lower.includes('relaxed') || lower.includes('chill') || lower.includes('easy')) {
        return { type: 'make_more_relaxed', targetDay, raw: text };
    }

    if (lower.includes('swap') || lower.includes('change')) {
        return { type: 'swap_activity', targetDay, raw: text };
    }

    return { type: 'unknown', targetDay, raw: text };
}

export function applyEdit(itinerary: Itinerary, command: EditCommand): { success: boolean; updatedItinerary?: Itinerary; message: string } {
    console.log(`[EditEngine] Applying: ${command.type} on Day ${command.targetDay}`);

    if (command.type === 'unknown') {
        return { success: false, message: "I couldn't understand what you want to change. Try saying: 'Make Day 2 more relaxed'." };
    }

    // Deep copy to avoid mutation issues
    const newItinerary: Itinerary = JSON.parse(JSON.stringify(itinerary));
    const dayIndex = command.targetDay - 1;

    if (dayIndex < 0 || dayIndex >= newItinerary.days.length) {
        return { success: false, message: `I can't find Day ${command.targetDay} in your plan.` };
    }

    const dayPlan = newItinerary.days[dayIndex];

    // EXECUTE LOGIC
    if (command.type === 'make_more_relaxed') {
        // Logic: Remove last activity, add relaxation
        if (dayPlan.blocks.length > 0) {
            const removed = dayPlan.blocks.pop();
            dayPlan.blocks.push({
                time: "Late Afternoon",
                activity: "Relaxation & Free Time",
                duration: "2 hours",
                description: "Enjoy some downtime.",
                isFlexible: true
            });
            console.log(`[EditEngine] Relaxed Day ${command.targetDay}. Removed: ${removed?.activity}`);
            return { success: true, updatedItinerary: newItinerary, message: `I've made Day ${command.targetDay} more relaxed.` };
        } else {
            return { success: false, message: `Day ${command.targetDay} is already empty.` };
        }
    }

    if (command.type === 'swap_activity') {
        // Logic: Replace one activity with a generic placeholder (since we can't search POIs here pure deterministically without arguments)
        // For now, we'll just rename an activity to emphasize the swap
        if (dayPlan.blocks.length > 0) {
            // Swap the 'afternoon' or last block
            const lastBlock = dayPlan.blocks[dayPlan.blocks.length - 1];
            lastBlock.activity = "Swapped Activity (Surprise)";
            lastBlock.description = "A new activity based on your request.";
            return { success: true, updatedItinerary: newItinerary, message: `I've swapped an activity on Day ${command.targetDay}.` };
        }
    }

    return { success: false, message: "I couldn't apply that change." };
}

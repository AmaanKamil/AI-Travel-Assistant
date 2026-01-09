import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

export async function buildItinerary(pois: any[], days: number): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with ${pois.length} POIs`);

    const plans: DayPlan[] = [];

    // Simple round-robin assignment for mock
    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];

        // Morning
        const morningPoi = pois[0] || { name: 'Relax at Hotel', estimated_visit_duration_minutes: 120 };
        dailyBlocks.push({
            time: 'Morning',
            activity: `Visit ${morningPoi.name}`,
            duration: `${morningPoi.estimated_visit_duration_minutes} mins`
        });

        // Afternoon
        const afternoonPoi = pois[1] || { name: 'Local Market', estimated_visit_duration_minutes: 90 };
        dailyBlocks.push({
            time: 'Afternoon',
            activity: `Explore ${afternoonPoi.name}`,
            duration: `${afternoonPoi.estimated_visit_duration_minutes} mins`
        });

        // Evening
        const eveningPoi = pois[2] || { name: 'City Walk', estimated_visit_duration_minutes: 120 };
        dailyBlocks.push({
            time: 'Evening',
            activity: `Dinner at ${eveningPoi.name}`,
            duration: '90 mins'
        });

        plans.push({
            day: i,
            blocks: dailyBlocks
        });
    }

    return {
        title: `Your ${days}-Day Dubai Adventure`,
        days: plans
    };
}

export async function buildItineraryEdit(original: Itinerary, intent: EditIntent): Promise<Itinerary> {
    console.log(`[MCP: Builder] Editing itinerary... Intent: ${intent.change_type} on Day ${intent.target_day}`);

    // Deep clone to avoid mutating original directly in memory too early
    const updated = JSON.parse(JSON.stringify(original));

    if (!intent.target_day) return updated;

    const dayIndex = updated.days.findIndex((d: any) => d.day === intent.target_day);
    if (dayIndex === -1) return updated;

    const dayPlan = updated.days[dayIndex];

    // Apply dummy logic based on change type
    if (intent.change_type === 'make_more_relaxed') {
        // Remove one activity and increase duration of others
        if (dayPlan.blocks.length > 1) {
            dayPlan.blocks.pop(); // Remove evening or last block
            dayPlan.blocks[0].activity += " (Relaxed Pace)";
            dayPlan.blocks[0].duration = "4 hours";
        }
    }
    else if (intent.change_type === 'swap_activity') {
        // Just mock a swap
        dayPlan.blocks.forEach((block: any) => {
            if (!intent.target_block || block.time.toLowerCase().includes(intent.target_block.toLowerCase())) {
                block.activity = "New " + block.activity + " (Swapped)";
            }
        });
    }
    else if (intent.change_type === 'add_place') {
        dayPlan.blocks.push({
            time: 'Late Night',
            activity: 'Dessert at Global Village',
            duration: '45 mins'
        });
    }

    // Pass back updated full object
    return updated;
}

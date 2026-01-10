import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with ${pois.length} POIs. Pace: ${pace}`);

    const plans: DayPlan[] = [];
    const usedPOIs = new Set<string>();

    let poiIndex = 0;

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];

        // Logic based on pace
        // Relaxed: 1-2 major activities (Morning/Evening)
        // Medium: 2-3 activities
        // Packed: 3-4 activities

        let slots = ['Morning', 'Afternoon', 'Evening'];
        if (pace === 'relaxed') {
            slots = ['Morning', 'Evening']; // Skip afternoon heat or just less stuff
        } else if (pace === 'packed') {
            slots = ['Morning', 'Lunch', 'Afternoon', 'Evening'];
        }

        for (const slot of slots) {
            if (poiIndex >= pois.length) break;

            let poi = pois[poiIndex];

            // Deduplication Check (though simple linear scan avoids it mostly, but good for safety)
            if (usedPOIs.has(poi.name)) {
                poiIndex++;
                if (poiIndex < pois.length) poi = pois[poiIndex];
                else break;
            }

            // Assign POI
            dailyBlocks.push({
                time: slot,
                activity: `Visit ${poi.name}`,
                duration: `${poi.estimated_visit_duration_minutes} mins`
            });

            usedPOIs.add(poi.name);
            poiIndex++;
        }

        // Fallback if no POIs left
        if (dailyBlocks.length === 0) {
            dailyBlocks.push({
                time: 'Morning',
                activity: 'Free time to explore or relax at the hotel',
                duration: '120 mins'
            });
        }

        plans.push({
            day: i,
            blocks: dailyBlocks
        });
    }

    return {
        title: `Your ${days}-Day Dubai Adventure (${pace} pace)`,
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

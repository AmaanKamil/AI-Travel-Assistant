import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with ${pois.length} POIs. Pace: ${pace}`);

    const plans: DayPlan[] = [];
    const usedPOIs = new Set<string>();

    let poiIndex = 0;

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];

        // Pace Logic Definition
        let slots = ['Morning', 'Afternoon', 'Evening'];
        if (pace === 'relaxed') {
            slots = ['Morning', 'Evening']; // Leisurely start, rest in afternoon, dinner/walk
        } else if (pace === 'packed') {
            slots = ['Morning', 'Lunch', 'Afternoon', 'Early Evening', 'Late Night'];
        }

        for (const slot of slots) {
            // Find next unused POI
            let poi = null;
            while (poiIndex < pois.length) {
                const candidate = pois[poiIndex];
                if (!usedPOIs.has(candidate.name)) {
                    poi = candidate;
                    usedPOIs.add(candidate.name);
                    poiIndex++;
                    break;
                }
                poiIndex++;
            }

            if (poi) {
                dailyBlocks.push({
                    time: slot,
                    activity: `Visit ${poi.name}`,
                    duration: pace === 'relaxed' ? '2.5 hours' : '90 mins'
                });
            } else {
                // Feature: Global fallback if we run out of POIs
                // Only add "Free Time" if it's not the ONLY thing in the day
                if (dailyBlocks.length > 0) {
                    dailyBlocks.push({
                        time: slot,
                        activity: "Free time to explore local souks or relax",
                        duration: "Flexible"
                    });
                }
                break; // Stop adding slots for this day if no POIs
            }
        }

        // Ensure at least 2 activities per day if possible, or fill with fallback
        if (dailyBlocks.length < 2) {
            dailyBlocks.push({
                time: 'Afternoon',
                activity: 'Relaxing walk at the Hotel/Resort',
                duration: 'Unlimited'
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

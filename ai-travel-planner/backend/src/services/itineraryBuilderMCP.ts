import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

// Helper to identify "Iconic" POIs (Seeds or High Score)
const isIconic = (poi: any) => poi.score >= 50 || poi.metadata?.source === 'Seed';

export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with ${pois.length} POIs. Pace: ${pace}`);

    const plans: DayPlan[] = [];
    const usedPOI_IDs = new Set<string>(); // Global Deduplication Trackers

    // Define Zone Priority per Day (Round Robin)
    const ZONES = ['Downtown', 'Old Dubai', 'Marina', 'Jumeirah', 'Other'];

    // Day 1 -> Downtown, Day 2 -> Old Dubai, Day 3 -> Marina, etc.
    const getZoneForDay = (dayNum: number) => ZONES[(dayNum - 1) % ZONES.length];

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];
        const targetZone = getZoneForDay(i);
        console.log(`[MCP: Builder] Day ${i} Priority Zone: ${targetZone}`);

        let slots = ['Morning', 'Afternoon', 'Evening'];
        let maxItems = 3;

        if (pace === 'relaxed') {
            slots = ['Morning', 'Late Afternoon', 'Dinner'];
            maxItems = 3;
        } else if (pace === 'packed') {
            slots = ['Morning', 'Lunch', 'Afternoon', 'Sunset', 'Dinner'];
            maxItems = 5;
        }

        let dayItemCount = 0;
        let dayHasIconic = false;

        // Filter POIs for this Day's Zone
        let zonePOIs = pois.filter(p => !usedPOI_IDs.has(p.id) && (p.location.zone === targetZone || (!p.location.zone && targetZone === 'Other')));

        // If we run out of zone specific items, allow fallback to high score items globally
        let fallbackPOIs = pois.filter(p => !usedPOI_IDs.has(p.id) && p.location.zone !== targetZone);

        for (const slot of slots) {
            if (dayItemCount >= maxItems) break;

            let selectedPOI = null;

            // STRATEGY: 
            // 1. Try to find an ICONIC item in the ZONE (Best case)
            // 2. Try to find ANY item in the ZONE
            // 3. Fallback to ICONIC item ANYWHERE (If zone is dry)

            // 1. Iconic in Zone
            const iconicInZone = zonePOIs.find(p => isIconic(p));
            if (iconicInZone) {
                selectedPOI = iconicInZone;
            }
            // 2. Standard in Zone
            else if (zonePOIs.length > 0) {
                selectedPOI = zonePOIs[0]; // Already sorted by score
            }
            // 3. Fallback Iconic (Sacrifice geography for quality)
            else if (fallbackPOIs.some(p => isIconic(p))) {
                selectedPOI = fallbackPOIs.find(p => isIconic(p));
            }
            // 4. Fallback Any
            else if (fallbackPOIs.length > 0) {
                selectedPOI = fallbackPOIs[0];
            }

            if (selectedPOI) {
                dailyBlocks.push({
                    time: slot,
                    activity: `Visit ${selectedPOI.name} (${selectedPOI.location.zone || 'Dubai'})`,
                    duration: pace === 'relaxed' ? '2-3 hours' : '90 mins'
                });
                dayItemCount++;
                usedPOI_IDs.add(selectedPOI.id);

                // Refresh lists
                zonePOIs = zonePOIs.filter(p => p.id !== selectedPOI.id);
                fallbackPOIs = fallbackPOIs.filter(p => p.id !== selectedPOI.id);
            }
        }

        // Ensure at least 2 items per day
        if (dailyBlocks.length < 2) {
            dailyBlocks.push({
                time: 'Evening',
                activity: `Explore Local Area in ${targetZone}`,
                duration: '1 hour'
            });
        }

        plans.push({
            day: i,
            blocks: dailyBlocks
        });
    }

    // TRIP-LEVEL VALIDATION
    const tripHasCultural = plans.some(d => d.blocks.some(b => /museum|souk|mosque|heritage/i.test(b.activity)));

    if (!tripHasCultural && plans.length > 0) {
        plans[0].blocks[0] = {
            time: 'Morning',
            activity: 'Visit Dubai Museum & Al Fahidi Fort (Cultural Mandate)',
            duration: '2 hours'
        };
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

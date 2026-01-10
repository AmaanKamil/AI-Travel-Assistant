import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';
import { EditIntent } from '../types/intent';

// Helper to identify "Iconic" POIs (Seeds or High Score)
const isIconic = (poi: any) => poi.score >= 50 || poi.metadata?.source === 'Seed';

export async function buildItinerary(pois: any[], days: number, pace: string = 'medium'): Promise<Itinerary> {
    console.log(`[MCP: Builder] Building ${days}-day itinerary with ${pois.length} POIs. Pace: ${pace}`);

    const plans: DayPlan[] = [];
    const usedPOI_IDs = new Set<string>(); // Global Deduplication Trackers

    // 1. Separate POIs into Tiers
    const iconicPOIs = pois.filter(p => isIconic(p));
    const standardPOIs = pois.filter(p => !isIconic(p));

    // Sort Iconic by Score Descending
    iconicPOIs.sort((a, b) => (b.score || 0) - (a.score || 0));

    let iconicIndex = 0;
    let standardIndex = 0;

    for (let i = 1; i <= days; i++) {
        const dailyBlocks: TimeBlock[] = [];

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
        let dayHasCultural = false;

        for (const slot of slots) {
            if (dayItemCount >= maxItems) break;

            let selectedPOI = null;

            // RULE: Allocating the FIRST slot of the day to an ICONIC POI if possible
            if (!dayHasIconic && iconicIndex < iconicPOIs.length) {
                // Find next unused Iconic
                while (iconicIndex < iconicPOIs.length) {
                    const candidate = iconicPOIs[iconicIndex];
                    if (!usedPOI_IDs.has(candidate.id)) {
                        selectedPOI = candidate;
                        usedPOI_IDs.add(candidate.id);
                        dayHasIconic = true;
                        iconicIndex++;
                        break;
                    }
                    iconicIndex++;
                }
            }

            // If no iconic selected (or already have one), try standard POIs
            if (!selectedPOI) {
                while (standardIndex < standardPOIs.length) {
                    const candidate = standardPOIs[standardIndex];
                    if (!usedPOI_IDs.has(candidate.id)) {
                        selectedPOI = candidate;
                        usedPOI_IDs.add(candidate.id);
                        standardIndex++;
                        break;
                    }
                    standardIndex++;
                }
            }

            // Fallback: If ran out of standard, try remaining Iconics
            if (!selectedPOI && iconicIndex < iconicPOIs.length) {
                while (iconicIndex < iconicPOIs.length) {
                    const candidate = iconicPOIs[iconicIndex];
                    if (!usedPOI_IDs.has(candidate.id)) {
                        selectedPOI = candidate;
                        usedPOI_IDs.add(candidate.id);
                        dayHasIconic = true;
                        iconicIndex++;
                        break;
                    }
                    iconicIndex++;
                }
            }

            if (selectedPOI) {
                dailyBlocks.push({
                    time: slot,
                    activity: `Visit ${selectedPOI.name}`,
                    duration: pace === 'relaxed' ? '2-3 hours' : '90 mins'
                });
                dayItemCount++;

                // Track Attributes
                if (/museum|souk|mosque|heritage|art|culture|history/i.test(selectedPOI.category) ||
                    /museum|souk|mosque|heritage|art|culture|history/i.test(selectedPOI.name)) {
                    dayHasCultural = true;
                }
            }
        }

        // POST-DAY VALIDATION & REPAIRS

        // Ensure Cultural (if it's missing globally, we might force it, but let's check day level)
        // If we extracted a Cultural POI during generation, great.
        // The Request requires "At least one cultural experience in the FULL trip".
        // We defer strict Day 1 injection if missing later, or rely on POI mix.

        // Ensure at least 2 items
        if (dailyBlocks.length < 2) {
            dailyBlocks.push({
                time: 'Evening',
                activity: 'Walk along the Dubai Water Canal',
                duration: '1 hour'
            });
        }

        plans.push({
            day: i,
            blocks: dailyBlocks
        });
    }

    // TRIP-LEVEL VALIDATION
    // Check if whole trip has cultural item
    const tripHasCultural = plans.some(d => d.blocks.some(b => /museum|souk|mosque|heritage/i.test(b.activity)));

    if (!tripHasCultural && plans.length > 0) {
        // Force Inject Cultural into Day 1 Morning
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

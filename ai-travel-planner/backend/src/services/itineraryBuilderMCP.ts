import { Itinerary, DayPlan, TimeBlock } from '../types/itinerary';

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

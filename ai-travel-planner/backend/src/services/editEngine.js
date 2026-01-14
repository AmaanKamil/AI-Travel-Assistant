"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDeterministicEdit = applyDeterministicEdit;
function applyDeterministicEdit(itinerary, intent) {
    var copy = JSON.parse(JSON.stringify(itinerary));
    var targetDayIndex = intent.day - 1;
    var day = copy.days[targetDayIndex];
    if (!day)
        return copy;
    // --- STRATEGY: RELAX DAY ---
    if (intent.change === 'relax' || intent.change_type === 'make_more_relaxed') {
        // Remove activity with shortest duration or last activity that isn't dinner
        var eligibleToRemove = day.blocks.filter(function (b) {
            return !b.time.toLowerCase().includes('dinner') &&
                !b.time.toLowerCase().includes('lunch');
        });
        if (eligibleToRemove.length > 0) {
            // Remove the last eligible activity to free up time
            var toRemove_1 = eligibleToRemove[eligibleToRemove.length - 1];
            day.blocks = day.blocks.filter(function (b) { return b !== toRemove_1; });
            // Add a "Leisure" block in its place or at the end
            day.blocks.push({
                time: 'Afternoon Break',
                activity: 'Leisure & Relaxation',
                duration: 'Flexible',
                description: 'Time to relax at a local cafe or pool.'
            });
        }
    }
    // --- STRATEGY: MAKE PACKED (ADD) ---
    if (intent.change_type === 'add_place' || intent.change === 'add_place') {
        // Add a generic activity in the evening or morning if empty
        day.blocks.push({
            time: 'Late Evening',
            activity: 'Dessert or Late Night Stroll',
            duration: '45 mins',
            description: 'Wrap up the day with a quick visit nearby.'
        });
    }
    // --- STRATEGY: SWAP / CHANGE ---
    // Simple heuristic: If user said "Swap X", we might not know X perfectly without complex NLP, 
    // but we can "Change" the main activity of the day.
    if (intent.change === 'swap_activity' || intent.change === 'other') {
        // Find a main activity
        var mainActivity = day.blocks.find(function (b) { return b.duration.includes('hour'); });
        if (mainActivity) {
            mainActivity.activity = "Alternative: ".concat(mainActivity.activity, " (Modified)");
            mainActivity.description += ' [Swapped based on request]';
        }
    }
    return copy;
}

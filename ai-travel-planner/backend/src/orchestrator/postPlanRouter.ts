export type PostPlanCommand = 'EXPLAIN' | 'EDIT' | 'EXPORT' | 'UNKNOWN';

export function routePostPlanCommand(text: string): PostPlanCommand {
    const t = text.toLowerCase();

    // Explain Logic
    if (
        t.includes('why') ||
        t.includes('reason') ||
        t.includes('chose') ||
        t.includes('choose')
    ) return 'EXPLAIN';

    // Edit Logic
    if (
        t.includes('change') ||
        t.includes('edit') ||
        t.includes('swap') ||
        t.includes('remove') ||
        t.includes('add') ||
        t.includes('make') || // "make day X relaxed"
        t.includes('prefer')
    ) return 'EDIT';

    // Export Logic
    if (
        t.includes('email') ||
        t.includes('send') ||
        t.includes('pdf') ||
        t.includes('export')
    ) return 'EXPORT';

    return 'UNKNOWN';
}

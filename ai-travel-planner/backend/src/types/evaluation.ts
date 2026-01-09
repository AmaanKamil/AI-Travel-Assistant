export interface EvaluationReport {
    passed: boolean;
    issues: string[];
}

export interface EditCorrectnessReport {
    passed: boolean;
    issues: string[];
    diff_summary?: string;
}

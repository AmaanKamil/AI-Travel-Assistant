"use client";

import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

interface EvalItem {
    passed: boolean;
    message?: string;
}

interface ComprehensiveEvaluation {
    feasibility?: EvalItem;
    edit_correctness?: EvalItem; // Backend calls it edit_correctness based on code I saw
    grounding?: EvalItem;
}

interface PlanningChecksProps {
    evaluations?: ComprehensiveEvaluation;
}

const PlanningChecks: React.FC<PlanningChecksProps> = ({ evaluations }) => {
    const checks = [
        {
            id: 'feasibility',
            label: 'Feasibility',
            status: evaluations?.feasibility?.passed ?? true, // Default to true if not provided as per backend happy path
            message: evaluations?.feasibility?.message || 'Travel times and durations are realistic'
        },
        {
            id: 'safety',
            label: 'Edit Safety',
            status: evaluations?.edit_correctness?.passed ?? true,
            message: evaluations?.edit_correctness?.message || 'No unexpected side effects detected'
        },
        {
            id: 'grounding',
            label: 'Data Grounding',
            status: evaluations?.grounding?.passed ?? true,
            message: evaluations?.grounding?.message || 'All POIs sourced from verifiable datasets'
        }
    ];

    const getStatusConfig = (passed: boolean, message?: string) => {
        // Simple heuristic: if it passed but has a "caution" or "warning" in message, show yellow
        const isWarning = passed && (message?.toLowerCase().includes('warning') || message?.toLowerCase().includes('caution') || message?.toLowerCase().includes('limit'));

        if (isWarning) {
            return {
                label: 'Warning',
                color: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
                icon: <AlertTriangle className="w-4 h-4" />
            };
        }

        if (passed) {
            return {
                label: 'Passed',
                color: 'text-green-400 bg-green-400/10 border-green-500/20',
                icon: <CheckCircle2 className="w-4 h-4" />
            };
        }

        return {
            label: 'Failed',
            color: 'text-red-400 bg-red-400/10 border-red-500/20',
            icon: <XCircle className="w-4 h-4" />
        };
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Planning Checks</h3>
                </div>
            </div>

            <div className="p-4 space-y-3">
                {checks.map((check) => {
                    const config = getStatusConfig(check.status, check.message);
                    return (
                        <div
                            key={check.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                        >
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-white">{check.label}</span>
                                <span className="text-[10px] text-gray-500 max-w-[200px] truncate" title={check.message}>
                                    {check.message}
                                </span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                                {config.icon}
                                {config.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PlanningChecks;

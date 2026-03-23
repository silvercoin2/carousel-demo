"use client";

import type { ScoreSet } from "@/lib/types";
import { getScoreColor } from "@/lib/formatters";

interface ScoreBadgeProps {
  scores: ScoreSet;
}

export default function ScoreBadge({ scores }: ScoreBadgeProps) {
  const dimensions = [
    { label: "Hook strength", value: scores.hookStrength },
    { label: "Clarity", value: scores.clarity },
    { label: "Audience fit", value: scores.audienceFit },
    { label: "Engagement", value: scores.engagementPotential },
    { label: "CTA strength", value: scores.ctaStrength },
  ];

  const averageRaw =
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  const average = Number(averageRaw.toFixed(1));

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-900">Quality scores</h4>
        <div
          className={`rounded-lg bg-white/80 px-2.5 py-1 text-lg font-bold tabular-nums shadow-sm ring-1 ring-slate-200/60 ${getScoreColor(averageRaw)}`}
        >
          {average.toFixed(1)}
          <span className="text-sm font-semibold text-slate-400">/10</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {dimensions.map((dim) => (
          <div key={dim.label} className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-600">{dim.label}</span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-[55%]">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                  style={{ width: `${Math.min(100, (dim.value / 10) * 100)}%` }}
                />
              </div>
              <span
                className={`w-7 shrink-0 text-right text-xs font-bold tabular-nums ${getScoreColor(dim.value)}`}
              >
                {dim.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

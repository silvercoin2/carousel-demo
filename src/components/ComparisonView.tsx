"use client";

import type { ComparativeJudgeResult, GenerationResult } from "@/lib/types";
import ResultCard from "./ResultCard";

interface ComparisonViewProps {
  singlePromptResult: GenerationResult;
  pipelineResult: GenerationResult;
  judgeResult?: ComparativeJudgeResult;
}

function WinnerRibbon({ label }: { label: string }) {
  return (
    <div className="absolute -top-2 right-3 z-[1] rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md shadow-emerald-600/25">
      {label}
    </div>
  );
}

export default function ComparisonView({
  singlePromptResult,
  pipelineResult,
  judgeResult,
}: ComparisonViewProps) {
  const singleAvgRaw =
    Object.values(singlePromptResult.scores).reduce((a, b) => a + b, 0) /
    Object.values(singlePromptResult.scores).length;

  const pipelineAvgRaw =
    Object.values(pipelineResult.scores).reduce((a, b) => a + b, 0) /
    Object.values(pipelineResult.scores).length;

  const singleAvg = singleAvgRaw.toFixed(1);
  const pipelineAvg = pipelineAvgRaw.toFixed(1);

  const rubricWinner =
    pipelineAvgRaw > singleAvgRaw ? "pipeline" : singleAvgRaw > pipelineAvgRaw ? "single" : null;
  const winner =
    judgeResult?.winner === "B"
      ? "pipeline"
      : judgeResult?.winner === "A"
        ? "single"
        : judgeResult?.winner === "tie"
          ? null
          : rubricWinner;
  const winnerSource = judgeResult ? "Judge" : "Scores";

  const pipelineSubtitle =
    "Strategies → filter → insights → style drafts → tournament → rubric + judge";

  return (
    <div className="space-y-8 rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-soft backdrop-blur-sm md:p-8">
      <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-violet-200/30 blur-2xl"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Side-by-side comparison
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Averages are shown to one decimal. When a judge runs, it can override a rubric tie.
            </p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
            Winner: {winnerSource}
          </span>
        </div>
        <p className="relative mt-4 text-sm text-slate-800">
          Pipeline{" "}
          <span
            className={`font-bold tabular-nums ${pipelineAvgRaw > singleAvgRaw ? "text-emerald-700" : "text-slate-900"}`}
          >
            {pipelineAvg}/10
          </span>{" "}
          vs single-shot{" "}
          <span
            className={`font-bold tabular-nums ${singleAvgRaw > pipelineAvgRaw ? "text-emerald-700" : "text-slate-900"}`}
          >
            {singleAvg}/10
          </span>
          {winner && (
            <span className="ml-1 text-slate-500">
              · Overall pick:{" "}
              <span className="font-semibold text-indigo-700">
                {winner === "pipeline" ? "Pipeline" : "Single-shot"}
              </span>
            </span>
          )}
        </p>
        {judgeResult?.summary && (
          <p className="relative mt-3 rounded-lg border border-white/60 bg-white/60 px-3 py-2 text-xs leading-relaxed text-slate-600 backdrop-blur-sm">
            <span className="font-semibold text-slate-700">Judge note:</span> {judgeResult.summary}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative">
          {winner === "single" && <WinnerRibbon label="Pick ✓" />}
          <ResultCard
            variant="single"
            result={singlePromptResult}
            title="Single-shot"
            subtitle="One call: outline + slides + CTA"
          />
        </div>

        <div className="relative">
          {winner === "pipeline" && <WinnerRibbon label="Pick ✓" />}
          <ResultCard
            variant="pipeline"
            result={pipelineResult}
            title="Multi-step pipeline"
            subtitle={pipelineSubtitle}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-5 backdrop-blur-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Key insights</h3>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>
              <span className="font-semibold text-slate-900">Single-shot</span> is lowest-latency and
              easiest to ship—great for drafts and tight loops.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
            <span>
              <span className="font-semibold text-slate-900">Pipeline</span> adds explicit strategy,
              expansion, multi-style drafts, and a tournament before scoring—often more consistent
              polish.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <span>
              <span className="font-semibold text-slate-900">Trade-off</span> is time vs structure:
              use the judge + rubric together to avoid “average inflation” hiding real differences.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}


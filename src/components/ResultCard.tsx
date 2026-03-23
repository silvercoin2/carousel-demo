"use client";

import type { GenerationResult } from "@/lib/types";
import ScoreBadge from "./ScoreBadge";

interface ResultCardProps {
  result: GenerationResult;
  title: string;
  subtitle?: string;
  variant?: "single" | "pipeline";
}

export default function ResultCard({ result, title, subtitle, variant = "single" }: ResultCardProps) {
  const accent =
    variant === "pipeline"
      ? "from-indigo-500 via-violet-500 to-purple-500"
      : "from-sky-500 via-blue-500 to-indigo-500";

  return (
    <div
      className={`h-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-soft sm:p-6 ${variant === "pipeline" ? "ring-1 ring-indigo-500/10" : "ring-1 ring-slate-200/60"}`}
    >
      <div
        className={`mb-4 h-1 w-full rounded-full bg-gradient-to-r ${accent} opacity-90`}
        aria-hidden
      />
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{subtitle}</p>}
      </div>

      <div className="mb-6">
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Hook</h4>
        <p className="text-base font-semibold leading-snug text-slate-900">{result.hook}</p>
      </div>

      <div className="mb-6">
        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Slides ({result.slides.length})
        </h4>
        <div className="space-y-2.5">
          {result.slides.map((slide, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-sm transition hover:border-slate-200 hover:bg-white"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-indigo-600 shadow-sm ring-1 ring-slate-200/80">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{slide.title}</p>
                  <p className="mt-1 leading-relaxed text-slate-600">{slide.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900/80">CTA</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-blue-950">{result.cta}</p>
      </div>

      <ScoreBadge scores={result.scores} />

      {result.meta && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {result.meta.selectedAngle && (
            <p>
              <span className="font-semibold text-slate-600">Angle:</span> {result.meta.selectedAngle}
            </p>
          )}
          {result.meta.rewriteStyle && (
            <p className="mt-1">
              <span className="font-semibold text-slate-600">Style:</span> {result.meta.rewriteStyle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

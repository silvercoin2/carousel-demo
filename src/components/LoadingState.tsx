"use client";

interface LoadingStateProps {
  currentStep?: string;
  progress?: number;
}

export default function LoadingState({ currentStep, progress = 0 }: LoadingStateProps) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-shimmer opacity-40"
      />
      <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <div className="relative mb-4 sm:mb-0 sm:mr-5">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
          <div className="pointer-events-none absolute inset-0 rounded-full bg-indigo-500/10 blur-md" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold tracking-tight text-slate-900">Generating your carousels</p>
          {currentStep ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{currentStep}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Starting pipeline…</p>
          )}

          <div className="mt-5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span className="font-semibold tabular-nums text-slate-700">{pct.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

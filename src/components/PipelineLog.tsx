"use client";

import type { PipelineLogItem } from "@/lib/types";

interface PipelineLogProps {
  logs: PipelineLogItem[];
}

const statusStyle: Record<string, { dot: string; ring: string; label: string }> = {
  success: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/25",
    label: "text-emerald-800",
  },
  fallback: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/25",
    label: "text-amber-900",
  },
  retry: {
    dot: "bg-blue-500",
    ring: "ring-blue-500/25",
    label: "text-blue-900",
  },
  error: {
    dot: "bg-rose-500",
    ring: "ring-rose-500/25",
    label: "text-rose-900",
  },
};

export default function PipelineLog({ logs }: PipelineLogProps) {
  if (logs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-soft backdrop-blur-sm sm:p-6">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Pipeline execution log</h3>
      <p className="mt-1 text-xs text-slate-500">Step-by-step trace for the multi-step path.</p>

      <div className="relative mt-5 space-y-0 pl-2">
        <div
          aria-hidden
          className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent"
        />
        {logs.map((log, idx) => {
          const s = statusStyle[log.status] ?? statusStyle.success;
          return (
            <div key={idx} className="relative flex gap-3 pb-5 last:pb-0">
              <div className="relative z-[1] mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${s.dot} shadow-sm ring-4 ${s.ring}`}
                />
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <p className={`text-sm font-semibold text-slate-900 ${s.label}`}>{log.step}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{log.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

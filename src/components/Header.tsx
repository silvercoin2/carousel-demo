"use client";

export default function Header() {
  return (
    <header className="relative border-b border-slate-200/80 bg-white/70 pb-10 pt-8 backdrop-blur-md sm:pb-12 sm:pt-10 lg:pb-14 lg:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent"
      />
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 xl:px-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-indigo-200/80 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                Lab demo
              </span>
              <span className="text-xs font-medium text-slate-400">OpenAI · Carousels</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Carousel{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Pipeline Lab
              </span>
            </h1>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              Compare one-shot prompting vs a multi-step pipeline for social carousel copy—then see
              rubric scores and a head-to-head judge pick.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

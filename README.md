# Carousel Pipeline Lab

Compare one-shot prompting vs multi-step AI content generation for social media carousel copy.

## What This Project Does

This application generates two carousel variants for the same input:

- `Single-shot`: direct generation in one prompt.
- `Multi-step pipeline`: angle generation, angle selection, slide drafting, scoring, and comparative judging.

It then presents both outputs side-by-side, with:

- per-dimension quality scores,
- pipeline execution logs,
- and a winner decision source (`Judge` or `Scores`).

## Tech Stack

- Next.js (App Router)
- React
- Tailwind CSS
- OpenAI API

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Set environment variable:

```bash
OPENAI_API_KEY=your_api_key_here
```

3. Start dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Core Flow

1. User submits `topic`, `niche`, `audience`, `tone`, `goal`, `slideCount`.
2. API generates:
   - `singlePromptResult`
   - `pipelineResult`
3. Both are scored with the same rubric.
4. A comparative judge (A/B/tie) evaluates both outputs directly.
5. UI displays results, logs, and winner source.

## Scoring and Winner Logic

- Primary quality dimensions:
  - `hookStrength`
  - `clarity`
  - `audienceFit`
  - `engagementPotential`
  - `ctaStrength`
- Scoring is context-aware (niche/audience/goal/tone) and deterministic (`temperature: 0`) for scoring calls.
- UI winner preference:
  1. Comparative judge result (if available)
  2. Score-average fallback

## Important Paths

- API (streaming): `src/app/api/generate/route.ts`
- API (non-streaming): `src/app/api/generate.ts`
- Prompt templates: `src/lib/prompts.ts`
- OpenAI wrapper: `src/lib/openai.ts`
- Validators/parsers: `src/lib/validators.ts`, `src/lib/formatters.ts`
- Types: `src/lib/types.ts`
- Comparison UI: `src/components/ComparisonView.tsx`
- Score UI: `src/components/ScoreBadge.tsx`
- Pipeline logs UI: `src/components/PipelineLog.tsx`

## Documentation

For full architecture, data contracts, scoring logic, failure modes, and evaluation runbook:

- `docs/architecture.md`

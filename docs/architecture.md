# Carousel Pipeline Lab - Architecture and Logic Documentation

## 1) Objective

`Carousel Pipeline Lab` evaluates whether a multi-step prompt pipeline produces better carousel copy than a one-shot prompt under identical input context.

The system aims to:

- generate two candidate outputs,
- score both against the same rubric,
- compare them directly with a comparative judge,
- and surface transparent execution logs for diagnostics.

---

## 2) High-Level Architecture

### Frontend

- `src/app/page.tsx`
  - Collects user input.
  - Calls `/api/generate` via SSE.
  - Streams progress and logs to UI.
- `src/components/ComparisonView.tsx`
  - Renders side-by-side outputs.
  - Shows score comparison.
  - Indicates winner source (`Judge` or `Scores`).
- `src/components/ScoreBadge.tsx`
  - Renders per-dimension scores and average.
- `src/components/PipelineLog.tsx`
  - Renders pipeline stage logs with status markers.

### Backend

- `src/app/api/generate/route.ts` (streaming)
  - Main runtime path for UI.
  - Emits progress/log/done/error SSE events.
- `src/app/api/generate.ts` (non-streaming)
  - JSON route with same orchestration logic.

### Shared Libraries

- `src/lib/openai.ts`
  - OpenAI request wrapper.
- `src/lib/prompts.ts`
  - All generation, scoring, and judging prompts.
- `src/lib/validators.ts`
  - request validation and robust JSON extraction.
- `src/lib/formatters.ts`
  - parsing/normalization helpers and candidate/judge parsers.
- `src/lib/types.ts`
  - API contracts and shared TypeScript types.

---

## 3) Request and Response Contracts

## Input (`GenerateRequest`)

- `topic: string`
- `niche: string`
- `audience: string`
- `tone: string`
- `goal: string`
- `slideCount: number (3..10)`

Validation logic: `validateGenerateRequest()` in `src/lib/validators.ts`.

## Output (`GenerateResponse`)

- `singlePromptResult: GenerationResult`
- `pipelineResult: GenerationResult`
- `judgeResult?: ComparativeJudgeResult`
- `logs: PipelineLogItem[]`
- `error?: string`

Key types: `src/lib/types.ts`.

---

## 4) Detailed Execution Pipeline

### Stage A: Single-Shot Branch

1. Build `SINGLE_SHOT_PROMPT`.
2. Generate output JSON.
3. Parse with:
   - `extractJSON()`
   - `parseGenerationResult()`
4. Score with `SCORING_PROMPT` using context (`niche`, `audience`, `goal`, `tone`).
5. Store in `singlePromptResult`.

### Stage B: Multi-Step Branch

1. **Angle Generation**
   - Prompt: `ANGLE_GENERATION_PROMPT`
   - Parse:
     - structured candidates via `parseAngleCandidates()`
     - string fallback via `parseAngles()`
2. **Angle Selection**
   - Prompt: `ANGLE_SELECTION_PROMPT`
   - Candidate list prefers structured objects (type/hook/description).
   - Selection result is normalized into a rich strategic angle string.
3. **Slide Drafting**
   - Prompt: `SLIDE_DRAFTING_PROMPT`
   - Consumes selected strategic angle.
4. **Quality Scoring**
   - Prompt: `SCORING_PROMPT` with context.
   - Produces per-dimension score set.
5. Store in `pipelineResult` with metadata (`selectedAngle`, `rewriteStyle`).

### Stage C: Comparative Judge

1. Prompt: `COMPARATIVE_JUDGE_PROMPT`
2. Compare Option A (single-shot) vs Option B (pipeline)
3. Parse via `parseComparativeJudgeResult()`
4. Return `judgeResult` when valid.

---

## 5) Scoring System

## Scoring Dimensions

- `hookStrength`
- `clarity`
- `audienceFit`
- `engagementPotential`
- `ctaStrength`

## Current Design Decisions

- Scoring calls use deterministic settings (`temperature: 0`) to reduce scoring variance.
- Prompt enforces integer scoring intent and strict rubric behavior.
- Score normalization clamps values into `1..10`.

## Tie-Reduction Improvements Already Applied

1. UI and logs use 1-decimal averages instead of whole-number rounding.
2. Fallback scoring defaults are neutral (`5`) rather than inflated (`7`).
3. JSON extraction was hardened to avoid nested-object parse truncation.
4. Winner source explicitly shown in UI (`Judge` vs `Scores`).

---

## 6) Winner Decision Logic

In `ComparisonView`:

1. If `judgeResult` exists:
   - `winner = B` => pipeline
   - `winner = A` => single-shot
   - `winner = tie` => tie
2. Else fallback to score-average comparison.

Winner source badge:

- `Winner decided by: Judge`
- `Winner decided by: Scores`

---

## 7) Logging and Observability

Each run includes stage-level logs:

- Single shot generation/scoring
- Multi-step stage 1..4
- Comparative judge stage
- execution timing diagnostics

UI log statuses:

- `success`
- `fallback`
- `retry`
- `error`

Use logs to identify:

- parse failures,
- fallback substitutions,
- scoring or judge degradation,
- and slow execution paths.

---

## 8) Reliability/Fallback Behavior

## JSON Extraction

`extractJSON()` attempts:

1. full-string parse,
2. fenced-code parse,
3. balanced-brace extraction (nested-safe).

## Score Normalization

`normalizeScore()`:

- numeric conversion,
- invalid => neutral fallback,
- clamp to `1..10`,
- integer rounding.

## Execution Timeout

Timeout is treated as a soft diagnostic (slow execution warning), not a hard failure if pipeline completes.

---

## 9) UI/Style Implementation Status

- Tailwind CSS is actively used across app/components.
- shadcn UI is not the active component system in this repo.
- Layout and spacing have been standardized for consistent container and card rhythm.

---

## 10) Known Constraints and Practical Notes

1. Content generation remains stochastic for drafting/generation stages.
2. Comparative judge is still LLM-based (improves tie handling, not absolute truth).
3. Near-equal outputs can still legitimately tie.
4. Higher quality confidence should be measured over repeated runs (win-rate, tie-rate, average delta).

---

## 11) Evaluation Runbook (Recommended)

For objective comparison:

1. Fix one input scenario.
2. Run 20-50 times.
3. Track:
   - judge win-rate (`A/B/tie`)
   - score win-rate (`pipelineAvg > singleAvg`)
   - average score delta
   - fallback frequency by stage
4. If pipeline underperforms:
   - inspect selection stage output shape,
   - inspect drafting quality coherence,
   - inspect scoring/judge parse fallbacks.

---

## 12) Key Source File Index

- `src/app/api/generate/route.ts`
- `src/app/api/generate.ts`
- `src/lib/prompts.ts`
- `src/lib/openai.ts`
- `src/lib/validators.ts`
- `src/lib/formatters.ts`
- `src/lib/types.ts`
- `src/components/ComparisonView.tsx`
- `src/components/ScoreBadge.tsx`
- `src/components/PipelineLog.tsx`


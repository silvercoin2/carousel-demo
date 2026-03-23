import { NextRequest, NextResponse } from "next/server";
import type {
  ComparativeJudgeResult,
  GenerateRequest,
  GenerationResult,
  PipelineLogItem,
  GenerateResponse,
} from "@/lib/types";
import { validateGenerateRequest, extractJSON } from "@/lib/validators";
import { callOpenAI } from "@/lib/openai";
import * as prompts from "@/lib/prompts";
import { parseAngleCandidates, parseComparativeJudgeResult, parseGenerationResult, parseAngles } from "@/lib/formatters";

// This is a "soft" guard used for logging; the pipeline should still complete.
// Multi-step runs can legitimately take >60s depending on model latency.
const EXECUTION_TIMEOUT = 180000;

const DEFAULT_FALLBACK: GenerationResult = {
  hook: "Amazing content hook that will stop scrolls",
  slides: [
    { title: "First Key Point", body: "This is the most important insight you need to understand." },
    { title: "Second Key Point", body: "Here's how this applies to your specific situation." },
    { title: "Third Key Point", body: "Take action on this today for immediate results." },
  ],
  cta: "Save this and share it with someone who needs it",
  scores: {
    hookStrength: 5,
    clarity: 5,
    audienceFit: 5,
    engagementPotential: 5,
    ctaStrength: 5,
  },
};

const eventData = (event: string, payload: any) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
const formatAngleCandidate = (candidate: { angleType?: string; hook?: string; description?: string } | string): string => {
  if (typeof candidate === "string") return candidate;
  const typePart = candidate.angleType ? `Type: ${candidate.angleType}` : "";
  const hookPart = candidate.hook ? `Hook: ${candidate.hook}` : "";
  const whyPart = candidate.description ? `Why it works: ${candidate.description}` : "";
  return [typePart, hookPart, whyPart].filter(Boolean).join(" | ");
};
const averageScore = (scores: GenerationResult["scores"]): string =>
  (
    (scores.hookStrength +
      scores.clarity +
      scores.audienceFit +
      scores.engagementPotential +
      scores.ctaStrength) /
    5
  ).toFixed(1);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let referenceLogs: PipelineLogItem[] = [];
      const startTime = Date.now();

      const write = (event: string, payload: any) => {
        controller.enqueue(encoder.encode(eventData(event, payload)));
      };

      try {
        const body = await request.json();
        const req = validateGenerateRequest(body);

        if (!req) {
          write("error", { message: "Invalid request. Required fields: topic, niche, audience, tone, goal, slideCount" });
          controller.close();
          return;
        }

        write("progress", { stage: "Starting generation", value: 0 });

        let singlePromptResult: GenerationResult;
        try {
          write("progress", { stage: "Single shot generation", value: 10 });
          const singleShotPrompt = prompts.SINGLE_SHOT_PROMPT(
            req.topic,
            req.niche,
            req.audience,
            req.tone,
            req.goal,
            req.slideCount
          );
          const singleResponse = await callOpenAI(singleShotPrompt, 2, 500, { temperature: 0.7, max_tokens: 1500 });
          const singleJson = extractJSON(singleResponse);

          if (singleJson) {
            const parsed = parseGenerationResult(singleJson);
            if (parsed) {
              singlePromptResult = parsed;
              referenceLogs.push({ step: "Single Shot Generation", status: "success", message: "Generated carousel using single prompt", timestamp: Date.now() });
              write("log", { step: "Single Shot Generation", status: "success", message: "Generated carousel using single prompt" });
              // Score the single-shot result
              try {
                const scoringPrompt = prompts.SCORING_PROMPT(
                  { hook: singlePromptResult.hook, slides: singlePromptResult.slides, cta: singlePromptResult.cta },
                  { niche: req.niche, audience: req.audience, goal: req.goal, tone: req.tone }
                );
                const scoreResponse = await callOpenAI(scoringPrompt, 2, 500, { temperature: 0, max_tokens: 600 });
                const scoreJson = extractJSON(scoreResponse);
                if (scoreJson) {
                  const parsedWithScores = parseGenerationResult({ ...singleJson, scores: scoreJson });
                  if (parsedWithScores) {
                    singlePromptResult = parsedWithScores;
                    referenceLogs.push({ step: "Single Shot Scoring", status: "success", message: `Scored single-shot carousel (average: ${averageScore(parsedWithScores.scores)}/10)`, timestamp: Date.now() });
                    write("log", { step: "Single Shot Scoring", status: "success", message: `Scored single-shot carousel (average: ${averageScore(parsedWithScores.scores)}/10)` });
                  }
                }
              } catch (scoreErr) {
                // Keep default scores
              }
            } else {
              throw new Error("Failed to parse single shot response");
            }
          } else {
            throw new Error("No valid JSON in single shot response");
          }
        } catch (error) {
          referenceLogs.push({ step: "Single Shot Generation", status: "fallback", message: `Error in single shot: ${error instanceof Error ? error.message : String(error)}. Using fallback.`, timestamp: Date.now() });
          write("log", { step: "Single Shot Generation", status: "fallback", message: "Single-shot fallback" });
          singlePromptResult = DEFAULT_FALLBACK;
        }

        let pipelineResult: GenerationResult;
        let selectedAngle = "default";

        try {
          write("progress", { stage: "Generating angles", value: 30 });

          const anglePrompt = prompts.ANGLE_GENERATION_PROMPT(req.topic, req.niche, req.audience, req.goal);
          const angleResponse = await callOpenAI(anglePrompt, 2, 500, { temperature: 0.7, max_tokens: 700 });
          const angleJson = extractJSON(angleResponse);
          const angleCandidates = angleJson ? parseAngleCandidates(angleJson) : [];
          const angles = angleJson ? parseAngles(angleJson) : [];

          if (!angles.length) throw new Error("No angles generated");

          referenceLogs.push({ step: "Step 1: Angle Generation", status: "success", message: `Generated ${angles.length} content angles`, timestamp: Date.now() });
          write("log", { step: "Step 1: Angle Generation", status: "success", message: `Generated ${angles.length} content angles` });

          write("progress", { stage: "Strategy filtering", value: 45 });
          type StrategyCandidate = { angleType?: string; hook?: string; description?: string };
          const structuredCandidates: StrategyCandidate[] = (angleCandidates
            .map((c) => (typeof c === "string" ? { hook: c } : c))
            .filter((c) => typeof c?.hook === "string" && c.hook.trim().length > 0) as StrategyCandidate[])
            .slice(0, 6);
          let shortlisted: StrategyCandidate[] = structuredCandidates.slice(0, 2);
          let bestAngle = angles[0];

          try {
            const filterPrompt = prompts.STRATEGY_FILTER_PROMPT(
              req.audience,
              req.niche,
              req.goal,
              structuredCandidates.length ? structuredCandidates : angles
            );
            const filterResponse = await callOpenAI(filterPrompt, 2, 500, { temperature: 0.1, max_tokens: 450 });
            const filterJson = extractJSON(filterResponse);
            const ranked = Array.isArray(filterJson?.topStrategies) ? filterJson.topStrategies : [];
            const indexes = ranked
              .map((x: any) => (typeof x?.index === "number" ? x.index : -1))
              .filter((idx: number) => idx >= 0 && idx < structuredCandidates.length);
            if (indexes.length >= 2) shortlisted = [structuredCandidates[indexes[0]], structuredCandidates[indexes[1]]];
            bestAngle = formatAngleCandidate(shortlisted[0] ?? angles[0]);
            selectedAngle = bestAngle;
            referenceLogs.push({ step: "Step 2: Strategy Filtering", status: "success", message: `Shortlisted ${shortlisted.length} strategies`, timestamp: Date.now() });
            write("log", { step: "Step 2: Strategy Filtering", status: "success", message: `Shortlisted ${shortlisted.length} strategies` });
          } catch (angleErr) {
            referenceLogs.push({ step: "Step 2: Strategy Filtering", status: "fallback", message: `Error in filtering: ${angleErr instanceof Error ? angleErr.message : String(angleErr)}. Using top available strategies.`, timestamp: Date.now() });
            write("log", { step: "Step 2: Strategy Filtering", status: "fallback", message: "Strategy filtering fallback" });
          }

          write("progress", { stage: "Insight expansion", value: 58 });
          type InsightPack = {
            coreInsights: string[];
            examples: string[];
            mistakesToAvoid: string[];
            emotionalTension: string;
            nonObviousClaim: string;
          };
          const strategyWithInsights: Array<{ strategy: StrategyCandidate; insights: InsightPack }> = [];
          for (const strategy of shortlisted) {
            try {
              const insightPrompt = prompts.INSIGHT_EXPANSION_PROMPT(
                req.topic,
                req.niche,
                req.audience,
                req.goal,
                strategy.angleType ?? "general",
                strategy.hook ?? "",
                strategy.description ?? ""
              );
              const insightResponse = await callOpenAI(insightPrompt, 2, 500, { temperature: 0.45, max_tokens: 900 });
              const insightJson = extractJSON(insightResponse);
              if (
                insightJson &&
                Array.isArray(insightJson.coreInsights) &&
                Array.isArray(insightJson.examples) &&
                Array.isArray(insightJson.mistakesToAvoid) &&
                typeof insightJson.emotionalTension === "string" &&
                typeof insightJson.nonObviousClaim === "string"
              ) {
                strategyWithInsights.push({
                  strategy,
                  insights: {
                    coreInsights: insightJson.coreInsights.slice(0, 3),
                    examples: insightJson.examples.slice(0, 3),
                    mistakesToAvoid: insightJson.mistakesToAvoid.slice(0, 3),
                    emotionalTension: insightJson.emotionalTension,
                    nonObviousClaim: insightJson.nonObviousClaim,
                  },
                });
              }
            } catch {}
          }
          if (!strategyWithInsights.length) {
            const fallback = shortlisted[0] ?? { hook: angles[0], angleType: "general", description: "" };
            strategyWithInsights.push({
              strategy: fallback,
              insights: {
                coreInsights: ["Audience pain point", "What usually goes wrong", "What to do instead"],
                examples: ["Concrete niche example 1", "Concrete niche example 2", "Concrete niche example 3"],
                mistakesToAvoid: ["Being generic", "Overexplaining", "Weak CTA"],
                emotionalTension: "frustration to clarity",
                nonObviousClaim: "Weak content is often a positioning problem, not a posting problem",
              },
            });
          }
          referenceLogs.push({ step: "Step 3: Insight Expansion", status: "success", message: `Expanded ${strategyWithInsights.length} strategy insight packs`, timestamp: Date.now() });
          write("log", { step: "Step 3: Insight Expansion", status: "success", message: `Expanded ${strategyWithInsights.length} strategy insight packs` });

          write("progress", { stage: "Drafting variants", value: 66 });
          const candidateDrafts: Array<{
            id: string;
            strategyLabel: string;
            style: "clean_professional" | "punchy_creator";
            result: GenerationResult;
            sourceJson: Record<string, any>;
          }> = [];

          for (const item of strategyWithInsights.slice(0, 2)) {
            for (const style of ["clean_professional", "punchy_creator"] as const) {
              try {
                const draftPrompt = prompts.DRAFT_FROM_INSIGHTS_PROMPT(
                  req.topic,
                  req.niche,
                  req.audience,
                  req.tone,
                  req.goal,
                  req.slideCount,
                  item.strategy.angleType ?? "general",
                  item.strategy.hook ?? "",
                  item.insights,
                  style
                );
                const draftResponse = await callOpenAI(draftPrompt, 2, 500, {
                  temperature: style === "punchy_creator" ? 0.75 : 0.6,
                  max_tokens: 1500,
                });
                const draftJson = extractJSON(draftResponse);
                const parsedDraft = draftJson ? parseGenerationResult(draftJson) : null;
                if (draftJson && parsedDraft) {
                  const label = formatAngleCandidate(item.strategy);
                  candidateDrafts.push({
                    id: `${item.strategy.angleType ?? "strategy"}-${style}`,
                    strategyLabel: label,
                    style,
                    result: parsedDraft,
                    sourceJson: draftJson,
                  });
                }
              } catch {}
            }
          }
          if (!candidateDrafts.length) throw new Error("No valid draft candidates generated");
          referenceLogs.push({ step: "Step 4: Multi-Draft Generation", status: "success", message: `Generated ${candidateDrafts.length} candidate drafts`, timestamp: Date.now() });
          write("log", { step: "Step 4: Multi-Draft Generation", status: "success", message: `Generated ${candidateDrafts.length} candidate drafts` });

          write("progress", { stage: "Candidate tournament", value: 76 });
          const pickPairWinner = async (
            a: typeof candidateDrafts[number],
            b: typeof candidateDrafts[number]
          ): Promise<typeof candidateDrafts[number]> => {
            const judgePrompt = prompts.CANDIDATE_PAIRWISE_PROMPT(
              { hook: a.result.hook, slides: a.result.slides, cta: a.result.cta },
              { hook: b.result.hook, slides: b.result.slides, cta: b.result.cta },
              { niche: req.niche, audience: req.audience, goal: req.goal, tone: req.tone }
            );
            const judgeResponse = await callOpenAI(judgePrompt, 2, 500, { temperature: 0, max_tokens: 350 });
            const judgeJson = extractJSON(judgeResponse);
            return judgeJson?.winner === "B" ? b : a;
          };

          let tournamentWinner = candidateDrafts[0];
          for (let i = 1; i < candidateDrafts.length; i++) {
            tournamentWinner = await pickPairWinner(tournamentWinner, candidateDrafts[i]);
          }
          referenceLogs.push({ step: "Step 5: Candidate Tournament", status: "success", message: `Tournament winner: ${tournamentWinner.id}`, timestamp: Date.now() });
          write("log", { step: "Step 5: Candidate Tournament", status: "success", message: `Tournament winner: ${tournamentWinner.id}` });

          write("progress", { stage: "Scoring output", value: 82 });
          const scoringPrompt = prompts.SCORING_PROMPT(
            { hook: tournamentWinner.result.hook, slides: tournamentWinner.result.slides, cta: tournamentWinner.result.cta },
            { niche: req.niche, audience: req.audience, goal: req.goal, tone: req.tone }
          );
          const scoreResponse = await callOpenAI(scoringPrompt, 2, 500, { temperature: 0, max_tokens: 600 });
          const scoreJson = extractJSON(scoreResponse);
          const scoredWinner =
            scoreJson
              ? parseGenerationResult({ ...tournamentWinner.sourceJson, scores: scoreJson }) ?? tournamentWinner.result
              : tournamentWinner.result;
          referenceLogs.push({ step: "Step 6: Final Scoring", status: "success", message: `Final pipeline winner scored at ${averageScore(scoredWinner.scores)}/10`, timestamp: Date.now() });
          write("log", { step: "Step 6: Final Scoring", status: "success", message: `Final pipeline winner scored at ${averageScore(scoredWinner.scores)}/10` });

          selectedAngle = tournamentWinner.strategyLabel;
          pipelineResult = {
            ...scoredWinner,
            meta: { selectedAngle, rewriteStyle: `${req.tone} for ${req.audience} (${tournamentWinner.style})` },
          };
        } catch (pipelineErr) {
          referenceLogs.push({ step: "Multi-Step Pipeline", status: "fallback", message: `Error in pipeline: ${pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr)}. Using fallback.`, timestamp: Date.now() });
          write("log", { step: "Multi-Step Pipeline", status: "fallback", message: "Pipeline fallback" });
          pipelineResult = { ...DEFAULT_FALLBACK, meta: { selectedAngle: "fallback", rewriteStyle: "fallback" } };
        }

        const elapsed = Date.now() - startTime;
        if (elapsed > EXECUTION_TIMEOUT) {
          referenceLogs.push({
            step: "Execution",
            status: "fallback",
            message: `Slow execution: took ${elapsed}ms (over ${EXECUTION_TIMEOUT}ms), but pipeline completed.`,
            timestamp: Date.now(),
          });
          // Keep UI from showing a hard failure when the pipeline still completes.
          write("log", {
            step: "Execution",
            status: "fallback",
            message: `Slow execution: took ${elapsed}ms (over ${EXECUTION_TIMEOUT}ms), but pipeline completed.`,
          });
        }

        let judgeResult: ComparativeJudgeResult | undefined;
        try {
          write("progress", { stage: "Comparative judging", value: 88 });
          const judgePrompt = prompts.COMPARATIVE_JUDGE_PROMPT(
            {
              hook: singlePromptResult.hook,
              slides: singlePromptResult.slides,
              cta: singlePromptResult.cta,
            },
            {
              hook: pipelineResult.hook,
              slides: pipelineResult.slides,
              cta: pipelineResult.cta,
            },
            {
              niche: req.niche,
              audience: req.audience,
              goal: req.goal,
              tone: req.tone,
            }
          );
          const judgeResponse = await callOpenAI(judgePrompt, 2, 500, { temperature: 0, max_tokens: 450 });
          const judgeJson = extractJSON(judgeResponse);
          const parsedJudge = judgeJson ? parseComparativeJudgeResult(judgeJson) : null;
          if (parsedJudge) {
            judgeResult = parsedJudge;
            referenceLogs.push({
              step: "Step 5: Comparative Judge",
              status: "success",
              message: `Judge winner: ${parsedJudge.winner}`,
              timestamp: Date.now(),
            });
            write("log", {
              step: "Step 5: Comparative Judge",
              status: "success",
              message: `Judge winner: ${parsedJudge.winner}`,
            });
          } else {
            referenceLogs.push({
              step: "Step 5: Comparative Judge",
              status: "fallback",
              message: "Judge output parsing failed; using rubric averages only.",
              timestamp: Date.now(),
            });
            write("log", {
              step: "Step 5: Comparative Judge",
              status: "fallback",
              message: "Judge output parsing failed; using rubric averages only.",
            });
          }
        } catch (judgeErr) {
          referenceLogs.push({
            step: "Step 5: Comparative Judge",
            status: "fallback",
            message: `Judge step failed: ${judgeErr instanceof Error ? judgeErr.message : String(judgeErr)}`,
            timestamp: Date.now(),
          });
          write("log", {
            step: "Step 5: Comparative Judge",
            status: "fallback",
            message: "Judge step failed; using rubric averages only.",
          });
        }

        const response: GenerateResponse = { singlePromptResult, pipelineResult, judgeResult, logs: referenceLogs };

        write("progress", { stage: "Finalizing", value: 95 });
        write("done", response);
        write("progress", { stage: "Complete", value: 100 });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        referenceLogs.push({ step: "Request Processing", status: "error", message, timestamp: Date.now() });
        write("error", { message, logs: referenceLogs });
      }

      controller.close();
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

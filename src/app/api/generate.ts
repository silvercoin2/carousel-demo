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

// Maximum execution time (in ms)
// This is a "soft" guard used for logging; the pipeline should still complete.
// Multi-step runs can legitimately take >60s depending on model latency.
const EXECUTION_TIMEOUT = 180000;

// Default fallback result
const DEFAULT_FALLBACK: GenerationResult = {
  hook: "Amazing content hook that will stop scrolls",
  slides: [
    {
      title: "First Key Point",
      body: "This is the most important insight you need to understand.",
    },
    {
      title: "Second Key Point",
      body: "Here's how this applies to your specific situation.",
    },
    {
      title: "Third Key Point",
      body: "Take action on this today for immediate results.",
    },
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
  const startTime = Date.now();
  const logs: PipelineLogItem[] = [];

  try {
    // Parse and validate request
    const body = await request.json();
    const req = validateGenerateRequest(body);

    if (!req) {
      return NextResponse.json(
        {
          error: "Invalid request. Required fields: topic, niche, audience, tone, goal, slideCount",
        },
        { status: 400 }
      );
    }

    // Generate single-shot result
    let singlePromptResult: GenerationResult;
    try {
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
          logs.push({
            step: "Single Shot Generation",
            status: "success",
            message: "Generated carousel using single prompt",
            timestamp: Date.now(),
          });

          // Score the single-shot result so comparison isn't biased by defaults
          try {
            const scoringPrompt = prompts.SCORING_PROMPT(
              {
                hook: singlePromptResult.hook,
                slides: singlePromptResult.slides,
                cta: singlePromptResult.cta,
              },
              { niche: req.niche, audience: req.audience, goal: req.goal, tone: req.tone }
            );
            const scoreResponse = await callOpenAI(scoringPrompt, 2, 500, { temperature: 0, max_tokens: 600 });
            const scoreJson = extractJSON(scoreResponse);
            if (scoreJson) {
              const parsedWithScores = parseGenerationResult({ ...singleJson, scores: scoreJson });
              if (parsedWithScores) {
                singlePromptResult = parsedWithScores;
              }
            }
          } catch {
            // Keep default scores
          }
        } else {
          throw new Error("Failed to parse single shot response");
        }
      } else {
        throw new Error("No valid JSON in single shot response");
      }
    } catch (error) {
      logs.push({
        step: "Single Shot Generation",
        status: "fallback",
        message: `Error in single shot: ${error instanceof Error ? error.message : String(error)}. Using fallback.`,
        timestamp: Date.now(),
      });
      singlePromptResult = DEFAULT_FALLBACK;
    }

    // Generate multi-step pipeline result (v2: divergent -> convergent pipeline)
    let pipelineResult: GenerationResult;
    let selectedAngle = "default";

    try {
      // Step 1: Generate strategy candidates
      const anglePrompt = prompts.ANGLE_GENERATION_PROMPT(
        req.topic,
        req.niche,
        req.audience,
        req.goal
      );

      const angleResponse = await callOpenAI(anglePrompt, 2, 500, { temperature: 0.7, max_tokens: 700 });
      const angleJson = extractJSON(angleResponse);
      const angleCandidates = angleJson ? parseAngleCandidates(angleJson) : [];
      const angles = angleJson ? parseAngles(angleJson) : [];

      if (angles.length === 0) {
        throw new Error("No angles generated");
      }

      logs.push({
        step: "Step 1: Angle Generation",
        status: "success",
        message: `Generated ${angles.length} content angles`,
        timestamp: Date.now(),
      });

      // Step 2: Filter top 2 strategies with explicit tradeoffs
      type StrategyCandidate = { angleType?: string; hook?: string; description?: string };
      const structuredCandidates: StrategyCandidate[] = (angleCandidates
        .map((c) => (typeof c === "string" ? { hook: c } : c))
        .filter((c) => typeof c?.hook === "string" && c.hook.trim().length > 0) as StrategyCandidate[])
        .slice(0, 6);

      let shortlisted: StrategyCandidate[] = structuredCandidates.slice(0, 2);
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
        logs.push({
          step: "Step 2: Strategy Filtering",
          status: "success",
          message: `Shortlisted ${shortlisted.length} strategies`,
          timestamp: Date.now(),
        });
      } catch (error) {
        logs.push({
          step: "Step 2: Strategy Filtering",
          status: "fallback",
          message: `Error in filtering: ${error instanceof Error ? error.message : String(error)}. Using top available strategies.`,
          timestamp: Date.now(),
        });
      }

      // Step 3: Insight expansion per shortlisted strategy.
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
        } catch {
          // handled by fallback below
        }
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

      logs.push({
        step: "Step 3: Insight Expansion",
        status: "success",
        message: `Expanded ${strategyWithInsights.length} strategy insight packs`,
        timestamp: Date.now(),
      });

      // Step 4: Generate 2 drafts per strategy (clean + punchy).
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
          } catch {
            // continue collecting others
          }
        }
      }
      if (!candidateDrafts.length) throw new Error("No valid draft candidates generated");
      logs.push({
        step: "Step 4: Multi-Draft Generation",
        status: "success",
        message: `Generated ${candidateDrafts.length} candidate drafts`,
        timestamp: Date.now(),
      });

      // Step 5: Candidate tournament via pairwise judging (no tie).
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
      logs.push({
        step: "Step 5: Candidate Tournament",
        status: "success",
        message: `Tournament winner: ${tournamentWinner.id}`,
        timestamp: Date.now(),
      });

      // Step 6: Final scoring for winning candidate.
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

      logs.push({
        step: "Step 6: Final Scoring",
        status: "success",
        message: `Final pipeline winner scored at ${averageScore(scoredWinner.scores)}/10`,
        timestamp: Date.now(),
      });

      selectedAngle = tournamentWinner.strategyLabel;
      pipelineResult = {
        ...scoredWinner,
        meta: {
          selectedAngle,
          rewriteStyle: `${req.tone} for ${req.audience} (${tournamentWinner.style})`,
        },
      };
    } catch (error) {
      logs.push({
        step: "Multi-Step Pipeline",
        status: "fallback",
        message: `Error in pipeline: ${error instanceof Error ? error.message : String(error)}. Using fallback.`,
        timestamp: Date.now(),
      });
      pipelineResult = {
        ...DEFAULT_FALLBACK,
        meta: {
          selectedAngle: "fallback",
          rewriteStyle: "fallback",
        },
      };
    }

    // Check timeout
    const elapsed = Date.now() - startTime;
    if (elapsed > EXECUTION_TIMEOUT) {
      logs.push({
        step: "Execution",
        status: "fallback",
        message: `Slow execution: took ${elapsed}ms (over ${EXECUTION_TIMEOUT}ms), but pipeline completed.`,
        timestamp: Date.now(),
      });
    }

    let judgeResult: ComparativeJudgeResult | undefined;
    try {
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
      const judgeResponse = await callOpenAI(judgePrompt, 2, 500, {
        temperature: 0,
        max_tokens: 450,
      });
      const judgeJson = extractJSON(judgeResponse);
      const parsedJudge = judgeJson ? parseComparativeJudgeResult(judgeJson) : null;
      if (parsedJudge) {
        judgeResult = parsedJudge;
        logs.push({
          step: "Step 5: Comparative Judge",
          status: "success",
          message: `Judge winner: ${parsedJudge.winner}`,
          timestamp: Date.now(),
        });
      } else {
        logs.push({
          step: "Step 5: Comparative Judge",
          status: "fallback",
          message: "Judge output parsing failed; using rubric averages only.",
          timestamp: Date.now(),
        });
      }
    } catch (judgeErr) {
      logs.push({
        step: "Step 5: Comparative Judge",
        status: "fallback",
        message: `Judge step failed: ${judgeErr instanceof Error ? judgeErr.message : String(judgeErr)}`,
        timestamp: Date.now(),
      });
    }

    const response: GenerateResponse = {
      singlePromptResult,
      pipelineResult,
      judgeResult,
      logs,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logs.push({
      step: "Request Processing",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
    });

    return NextResponse.json(
      {
        error: "Failed to generate carousel",
        logs,
      },
      { status: 500 }
    );
  }
}

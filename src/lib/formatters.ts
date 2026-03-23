import type { ComparativeJudgeResult, GenerationResult, ScoreSet, Slide } from "./types";

// Parse and validate generation result
export const parseGenerationResult = (json: Record<string, any>): GenerationResult | null => {
  try {
    const hook = json.hook;
    const slides = json.slides;
    const cta = json.cta;
    const scores = json.scores;

    if (!hook || typeof hook !== "string") return null;
    if (!Array.isArray(slides) || slides.length === 0) return null;
    if (!cta || typeof cta !== "string") return null;

    const defaultScores: ScoreSet = {
      // Neutral fallback to avoid artificially inflating failed scoring to "good".
      hookStrength: 5,
      clarity: 5,
      audienceFit: 5,
      engagementPotential: 5,
      ctaStrength: 5,
    };

    const validSlides: Slide[] = slides
      .filter(
        (s: any) =>
          s.title && typeof s.title === "string" && s.body && typeof s.body === "string"
      )
      .map((s: any) => ({
        title: s.title.trim(),
        body: s.body.trim(),
      }));

    if (validSlides.length === 0) return null;

    const validScores: ScoreSet = {
      hookStrength: normalizeScore(scores?.hookStrength ?? defaultScores.hookStrength),
      clarity: normalizeScore(scores?.clarity ?? defaultScores.clarity),
      audienceFit: normalizeScore(scores?.audienceFit ?? defaultScores.audienceFit),
      engagementPotential: normalizeScore(scores?.engagementPotential ?? defaultScores.engagementPotential),
      ctaStrength: normalizeScore(scores?.ctaStrength ?? defaultScores.ctaStrength),
    };

    return {
      hook: hook.trim(),
      slides: validSlides,
      cta: cta.trim(),
      scores: validScores,
      meta: json.meta,
    };
  } catch {
    return null;
  }
};

// Normalize score to 1-10 range
const normalizeScore = (score: any): number => {
  const num = typeof score === "number" ? score : Number(score);
  if (isNaN(num)) return 5;
  return Math.min(10, Math.max(1, Math.round(num)));
};

// Calculate average score
export const calculateAverageScore = (scores: ScoreSet): number => {
  const values = Object.values(scores);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};

// Format score display
export const formatScore = (score: number): string => {
  return `${score}/10`;
};

// Get score color for display
export const getScoreColor = (score: number): string => {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-yellow-600";
  return "text-red-600";
};

// Parse angles from API response
export const parseAngleCandidates = (
  json: Record<string, any>
): Array<{ angleType?: string; hook?: string; description?: string } | string> => {
  try {
    if (!Array.isArray(json.angles)) return [];

    return json.angles
      .map((a: any) => {
        if (typeof a === "string") return a.trim();
        if (a == null || typeof a !== "object") return null;

        const angleType =
          typeof a.angleType === "string" && a.angleType.trim().length ? a.angleType.trim() : undefined;
        const hook =
          typeof a.hook === "string" && a.hook.trim().length ? a.hook.trim() : undefined;
        const description =
          typeof a.description === "string" && a.description.trim().length ? a.description.trim() : undefined;

        if (angleType || hook || description) return { angleType, hook, description };
        return null;
      })
      .filter((x) => x != null) as Array<{ angleType?: string; hook?: string; description?: string } | string>;
  } catch {
    return [];
  }
};

// Parse angles from API response
export const parseAngles = (json: Record<string, any>): string[] => {
  try {
    if (!Array.isArray(json.angles)) return [];

    return json.angles
      .map((a: any) => {
        // support multiple shapes: { angle }, { hook }, { angleType, hook }, or simple string
        if (typeof a === "string") return a.trim();
        if (a == null) return null;
        const hook =
          typeof a.hook === "string" && a.hook.trim().length ? a.hook.trim() : undefined;
        const angle =
          typeof a.angle === "string" && a.angle.trim().length ? a.angle.trim() : undefined;
        const title =
          typeof a.title === "string" && a.title.trim().length ? a.title.trim() : undefined;
        const angleType =
          typeof a.angleType === "string" && a.angleType.trim().length ? a.angleType.trim() : undefined;
        const description =
          typeof a.description === "string" && a.description.trim().length ? a.description.trim() : undefined;

        if (hook && angleType) {
          return description
            ? `Type: ${angleType} | Hook: ${hook} | Why it works: ${description}`
            : `Type: ${angleType} | Hook: ${hook}`;
        }

        if (hook) return hook;
        if (angle) return angle;
        if (title) return title;
        // fall back to combining angleType + hook if available
        if (angleType && typeof a.hook === "string" && a.hook.trim().length) return `${angleType}: ${a.hook.trim()}`;
        return null;
      })
      .filter((s) => typeof s === "string") as string[];
  } catch {
    return [];
  }
};

export const parseComparativeJudgeResult = (
  json: Record<string, any>
): ComparativeJudgeResult | null => {
  try {
    const winner = json?.winner;
    const summary = json?.summary;
    if (winner !== "A" && winner !== "B" && winner !== "tie") return null;
    if (typeof summary !== "string" || !summary.trim()) return null;

    return {
      winner,
      summary: summary.trim(),
      categoryWinners:
        json?.categoryWinners && typeof json.categoryWinners === "object"
          ? json.categoryWinners
          : undefined,
    };
  } catch {
    return null;
  }
};

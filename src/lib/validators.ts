import type { GenerateRequest } from "./types";

export const validateGenerateRequest = (data: unknown): GenerateRequest | null => {
  if (!data || typeof data !== "object") return null;

  const req = data as Partial<GenerateRequest>;

  if (
    !req.topic ||
    !req.niche ||
    !req.audience ||
    !req.tone ||
    !req.goal ||
    !req.slideCount
  ) {
    return null;
  }

  if (typeof req.topic !== "string" || req.topic.trim().length === 0) return null;
  if (typeof req.niche !== "string" || req.niche.trim().length === 0) return null;
  if (typeof req.audience !== "string" || req.audience.trim().length === 0) return null;
  if (typeof req.tone !== "string" || req.tone.trim().length === 0) return null;
  if (typeof req.goal !== "string" || req.goal.trim().length === 0) return null;
  if (typeof req.slideCount !== "number" || req.slideCount < 3 || req.slideCount > 10) return null;

  return {
    topic: req.topic.trim(),
    niche: req.niche.trim(),
    audience: req.audience.trim(),
    tone: req.tone.trim(),
    goal: req.goal.trim(),
    slideCount: Math.floor(req.slideCount),
  };
};

export const validateJSON = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

export const extractJSON = (text: string): Record<string, any> | null => {
  const tryParse = (candidate: string): Record<string, any> | null => {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };

  // Try to parse the entire string first
  const direct = tryParse(text);
  if (direct) return direct;

  // Prefer fenced JSON blocks if present (reduces greedy-brace extraction failures)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const parsed = tryParse(fenced[1]);
    if (parsed) return parsed;
  }

  // Fall back to extracting balanced JSON objects from text.
  // This avoids non-greedy regex truncation on nested objects.
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") starts.push(i);
  }

  for (const start of starts) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === "{") depth++;
      if (ch === "}") depth--;

      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        const parsed = tryParse(candidate);
        if (parsed) return parsed;
        break;
      }
    }
  }

  return null;
};

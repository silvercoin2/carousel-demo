// Request and input types
export type GenerateRequest = {
  topic: string;
  niche: string;
  audience: string;
  tone: string;
  goal: string;
  slideCount: number;
};

// Content types
export type Slide = {
  title: string;
  body: string;
};

export type ScoreSet = {
  hookStrength: number;
  clarity: number;
  audienceFit: number;
  engagementPotential: number;
  ctaStrength: number;
};

export type AngleCandidate = {
  angle: string;
  description: string;
  reason?: string;
};

// Generation result
export type GenerationResult = {
  hook: string;
  slides: Slide[];
  cta: string;
  scores: ScoreSet;
  meta?: {
    selectedAngle?: string;
    rewriteStyle?: string;
  };
};

// Pipeline logging
export type PipelineLogItem = {
  step: string;
  status: "success" | "fallback" | "retry" | "error";
  message: string;
  timestamp: number;
};

export type ComparativeJudgeResult = {
  winner: "A" | "B" | "tie";
  summary: string;
  categoryWinners?: {
    hookQuality?: "A" | "B" | "tie";
    clarity?: "A" | "B" | "tie";
    audienceFit?: "A" | "B" | "tie";
    engagementPotential?: "A" | "B" | "tie";
    ctaAlignment?: "A" | "B" | "tie";
    narrativeFlow?: "A" | "B" | "tie";
  };
};

// Full API response
export type GenerateResponse = {
  singlePromptResult: GenerationResult;
  pipelineResult: GenerationResult;
  judgeResult?: ComparativeJudgeResult;
  logs: PipelineLogItem[];
  error?: string;
};

// Preset input examples
export type PresetInput = {
  name: string;
  description: string;
  data: GenerateRequest;
};

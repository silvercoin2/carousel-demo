// Prompt templates for carousel generation pipeline

export const ANGLE_GENERATION_PROMPT = (
  topic: string,
  niche: string,
  audience: string,
  goal: string
): string => `
You are a senior Instagram content strategist specializing in ${niche}.

Your task is to propose 5 DISTINCT strategic angles for an Instagram carousel about:
"${topic}"

Target audience:
${audience}

Primary goal:
${goal}

Important rules:
- Each angle must feel meaningfully different in strategy, not just wording.
- Cover these persuasion styles exactly once each: contrarian, emotional_contrast, tactical, myth_busting, story_led, data_led.
- Angles should be optimized for Instagram carousel performance: strong curiosity, clarity, and scroll-stopping relevance.
- Avoid generic or repetitive hooks.

Return ONLY valid JSON in this exact format:
{
  "angles": [
    {
      "angleType": "pain-point | myth-busting | tactical | transformation | authority | etc",
      "hook": "specific hook/title",
      "description": "1-2 sentence explanation of why this angle fits the audience and goal"
    }
  ]
}
`;

export const STRATEGY_FILTER_PROMPT = (
  audience: string,
  niche: string,
  goal: string,
  angles: Array<{ angleType?: string; hook?: string; description?: string } | string>
): string => `
You are a lead growth strategist for Instagram content in the ${niche} space.

Select the top 2 strategies for this audience/goal using explicit tradeoffs.

Audience:
${audience}

Goal:
${goal}

Candidate strategies:
${angles
  .map((a, i) =>
    typeof a === "string"
      ? `${i}. ${a}`
      : `${i}. Type: ${a.angleType ?? "unknown"} | Hook: ${a.hook ?? ""} | Why it works: ${a.description ?? ""}`
  )
  .join("\n")}

Rank using:
1) attention capture
2) audience fit
3) memorability
4) clarity for carousel format

Return ONLY valid JSON:
{
  "topStrategies": [
    { "index": 0, "why": "short reason" },
    { "index": 1, "why": "short reason" }
  ]
}
`;

export const INSIGHT_EXPANSION_PROMPT = (
  topic: string,
  niche: string,
  audience: string,
  goal: string,
  strategyType: string,
  strategyHook: string,
  strategyDescription: string
): string => `
You are a senior content strategist in ${niche}.

Expand this strategy into concrete substance for an Instagram carousel.

Topic: ${topic}
Audience: ${audience}
Goal: ${goal}
Strategy type: ${strategyType}
Strategy hook: ${strategyHook}
Strategy description: ${strategyDescription}

Return ONLY valid JSON:
{
  "coreInsights": ["...", "...", "..."],
  "examples": ["...", "...", "..."],
  "mistakesToAvoid": ["...", "...", "..."],
  "emotionalTension": "...",
  "nonObviousClaim": "..."
}
`;

export const DRAFT_FROM_INSIGHTS_PROMPT = (
  topic: string,
  niche: string,
  audience: string,
  tone: string,
  goal: string,
  slideCount: number,
  strategyType: string,
  strategyHook: string,
  insightPack: {
    coreInsights: string[];
    examples: string[];
    mistakesToAvoid: string[];
    emotionalTension: string;
    nonObviousClaim: string;
  },
  styleVariant: "clean_professional" | "punchy_creator"
): string => `
You are an elite Instagram carousel copywriter in ${niche}.

Write a ${slideCount}-slide Instagram carousel.

Topic: ${topic}
Audience: ${audience}
Tone: ${tone}
Goal: ${goal}
Strategy type: ${strategyType}
Strategy hook: ${strategyHook}
Style variant: ${styleVariant}

Insight pack:
- Core insights: ${insightPack.coreInsights.join(" | ")}
- Examples: ${insightPack.examples.join(" | ")}
- Mistakes to avoid: ${insightPack.mistakesToAvoid.join(" | ")}
- Emotional tension: ${insightPack.emotionalTension}
- Non-obvious claim: ${insightPack.nonObviousClaim}

Rules:
- Keep one core idea per slide.
- Be specific to this audience; avoid generic business language.
- Keep slide text concise and skimmable.
- Ensure the CTA is strongly aligned to goal.

Return ONLY valid JSON:
{
  "hook": "attention-grabbing hook",
  "slides": [
    { "title": "slide title", "body": "slide body" }
  ],
  "cta": "goal-aligned call to action"
}
`;

export const CANDIDATE_PAIRWISE_PROMPT = (
  optionA: {
    hook: string;
    slides: Array<{ title: string; body: string }>;
    cta: string;
  },
  optionB: {
    hook: string;
    slides: Array<{ title: string; body: string }>;
    cta: string;
  },
  context: {
    niche: string;
    audience: string;
    goal: string;
    tone: string;
  }
): string => `
You are a strict head of social content quality.

Compare option A and B for this context.

Niche: ${context.niche}
Audience: ${context.audience}
Goal: ${context.goal}
Tone: ${context.tone}

Option A:
Hook: ${optionA.hook}
Slides:
${optionA.slides.map((s, i) => `Slide ${i + 1}: "${s.title}" — ${s.body}`).join("\n")}
CTA: ${optionA.cta}

Option B:
Hook: ${optionB.hook}
Slides:
${optionB.slides.map((s, i) => `Slide ${i + 1}: "${s.title}" — ${s.body}`).join("\n")}
CTA: ${optionB.cta}

Pick exactly one winner. Do NOT return tie.
Judge by:
- hook strength
- specificity
- clarity
- memorability
- CTA quality

Return ONLY valid JSON:
{
  "winner": "A" | "B",
  "reason": "short reason with one concrete evidence reference"
}
`;

export const ANGLE_SELECTION_PROMPT = (
  audience: string,
  niche: string,
  goal: string,
  angles: Array<{ angleType?: string; hook?: string; description?: string } | string>
): string => `
You are a lead growth strategist for Instagram content in the ${niche} space.

Your job is to select the SINGLE best carousel angle for the audience and business goal below.

Audience:
${audience}

Goal:
${goal}

Candidate angles:
${angles
  .map((a, i) =>
    typeof a === "string"
      ? `${i}. ${a}`
      : `${i}. Type: ${a.angleType ?? "unknown"} | Hook: ${a.hook ?? ""} | Why it works: ${a.description ?? ""}`
  )
  .join("\n")}

Selection criteria:
1. Highest likelihood of grabbing attention in the first slide
2. Best fit for the stated audience
3. Best alignment with the stated goal
4. Strongest potential for a clear, high-retention slide progression
5. Avoid generic or weakly differentiated angles

Return ONLY valid JSON in this exact format:
{
  "selectedIndex": 0,
  "selectedAngleType": "selected angle type",
  "selectedHook": "best hook",
  "reason": "Short (<=60 words) explanation referencing audience fit, engagement potential, and goal alignment"
}
`;

export const SLIDE_DRAFTING_PROMPT = (
  topic: string,
  niche: string,
  audience: string,
  tone: string,
  goal: string,
  slideCount: number,
  selectedAngle: string
): string => `
You are an elite Instagram carousel copywriter in the ${niche} market.

Create a HIGH-PERFORMING Instagram carousel about:
"${topic}"

Use this strategic angle (you will adapt from it):
"${selectedAngle}"

Strategic angle format you may see:
- Type: ...
- Hook: ...
- Why it works: ...

Audience:
${audience}

Tone:
${tone}

Goal:
${goal}

Number of slides:
${slideCount}

Requirements:
- The hook must be specific, bold, and immediately relevant.
- Use the strategic angle's Hook as the Slide 1 opening hook.
- Use the strategic angle's Why it works (or reason) to guide the narrative progression and CTA framing.
- The slides must flow logically from one to the next.
- Each slide should introduce one clear idea only.
- Do NOT copy the "Type:" / "Why it works:" labels into slide titles or bodies; treat them as internal guidance only.
- Avoid filler, fluff, vague advice, and repeated wording.
- The final CTA must match the goal exactly.
- Write copy that feels native to strong Instagram educational or creator content.
- Make the body text concise enough for carousel slides, not blog paragraphs.

Slide structure guidance:
- Slide 1: Hook / strong opening
- Middle slides: build argument, insight, or progression
- Final slide: actionable takeaway or CTA

Return ONLY valid JSON in this exact format:
{
  "hook": "attention-grabbing hook",
  "slides": [
    {
      "title": "slide title",
      "body": "slide body"
    }
  ],
  "cta": "goal-aligned call to action"
}
`;

export const REWRITE_PROMPT = (
  toneStyle: string,
  audienceLevel: string,
  content: {
    hook: string;
    slides: Array<{ title: string; body: string }>;
    cta: string;
  }
): string => `
You are a conversion-focused social copy editor.

Rewrite the carousel below for:
- Tone: ${toneStyle}
- Audience sophistication: ${audienceLevel}

Original content:
Hook: ${content.hook}
Slides:
${content.slides.map((s, i) => `Slide ${i + 1}: "${s.title}" — ${s.body}`).join("\n")}
CTA: ${content.cta}

Rewrite rules:
- Keep the same overall meaning and slide count.
- Improve clarity, specificity, and audience resonance.
- Make wording feel more native, persuasive, and polished.
- Remove generic phrases and weak wording.
- Tighten long or bloated lines.
- Preserve strong narrative progression across slides.
- Ensure the CTA still matches the audience and business intent.
- Keep one core idea per slide; avoid combining multiple concepts in one body.
- Strengthen specificity with concrete wording (avoid vague claims).

Return ONLY valid JSON in this exact format:
{
  "hook": "rewritten hook",
  "slides": [
    {
      "title": "rewritten title",
      "body": "rewritten body"
    }
  ],
  "cta": "rewritten cta"
}
`;

export const SINGLE_SHOT_PROMPT = (
  topic: string,
  niche: string,
  audience: string,
  tone: string,
  goal: string,
  slideCount: number
): string => `
You are an Instagram content strategist for ${niche}.

Create a solid Instagram carousel about:
"${topic}"

Audience:
${audience}

Tone:
${tone}

Goal:
${goal}

Number of slides:
${slideCount}

Instructions:
- Make it clear and engaging
- Use a good hook
- Keep slides concise
- End with a CTA that fits the goal

Return ONLY valid JSON in this exact format:
{
  "hook": "attention-grabbing hook",
  "slides": [
    {
      "title": "slide title",
      "body": "slide body"
    }
  ],
  "cta": "call to action"
}
`;

export const OUTLINE_PLANNING_PROMPT = (
  topic: string,
  niche: string,
  audience: string,
  goal: string,
  slideCount: number,
  selectedHook: string
): string => `
You are a content strategist designing the STRUCTURE of a high-performing Instagram carousel.

Topic:
"${topic}"

Niche:
${niche}

Audience:
${audience}

Goal:
${goal}

Selected hook:
"${selectedHook}"

Number of slides:
${slideCount}

Your job is NOT to write final copy yet.
Your job is to create the best slide-by-slide content plan.

Requirements:
- Build a strong logical progression from hook to CTA
- Each slide should serve a distinct purpose
- Avoid redundancy
- Ensure the sequence supports retention and conversion
- The final slide must lead naturally into the CTA
- Produce EXACTLY ${slideCount} slides in the "slides" array.
- slideNumber must be sequential from 1 to ${slideCount} with no gaps.
- Keep each purpose/titleDirection/bodyDirection concise and specific.

Return ONLY valid JSON in this exact format:
{
  "hook": "refined hook",
  "slides": [
    {
      "slideNumber": 1,
      "purpose": "what this slide is supposed to do",
      "titleDirection": "what kind of title this slide should have",
      "bodyDirection": "what content this slide should communicate"
    }
  ],
  "ctaDirection": "what the CTA should encourage the user to do"
}
`;

export const SLIDE_DRAFTING_FROM_OUTLINE_PROMPT = (
  niche: string,
  audience: string,
  tone: string,
  goal: string,
  outline: {
    hook: string;
    slides: Array<{
      slideNumber: number;
      purpose: string;
      titleDirection: string;
      bodyDirection: string;
    }>;
    ctaDirection: string;
  }
): string => `
You are an elite Instagram carousel copywriter for ${niche}.

Write final carousel copy using this approved outline.

Audience:
${audience}

Tone:
${tone}

Goal:
${goal}

Outline:
Hook: ${outline.hook}
Slides:
${outline.slides
  .map(
    (s) =>
      `Slide ${s.slideNumber} | Purpose: ${s.purpose} | Title direction: ${s.titleDirection} | Body direction: ${s.bodyDirection}`
  )
  .join("\n")}
CTA direction: ${outline.ctaDirection}

Requirements:
- Keep the structure exactly aligned to the outline
- Write concise, high-performing Instagram carousel copy
- Avoid repetition across slides
- Make each slide feel purposeful and connected
- Ensure the CTA is natural and aligned to the goal
- Preserve the outline slide count exactly.
- Keep each slide body concise (carousel-length, not paragraph-length).
- Each slide must advance the narrative; avoid generic filler transitions.

Return ONLY valid JSON in this exact format:
{
  "hook": "final hook",
  "slides": [
    {
      "title": "slide title",
      "body": "slide body"
    }
  ],
  "cta": "final CTA"
}
`;

export const COMPARATIVE_JUDGE_PROMPT = (
  singleContent: {
    hook: string;
    slides: Array<{ title: string; body: string }>;
    cta: string;
  },
  pipelineContent: {
    hook: string;
    slides: Array<{ title: string; body: string }>;
    cta: string;
  },
  context: {
    niche: string;
    audience: string;
    goal: string;
    tone: string;
  }
): string => `
You are a strict evaluator comparing two Instagram carousel outputs.

Context:
Niche: ${context.niche}
Audience: ${context.audience}
Goal: ${context.goal}
Tone: ${context.tone}

Option A:
Hook: ${singleContent.hook}
Slides:
${singleContent.slides.map((s, i) => `Slide ${i + 1}: "${s.title}" — ${s.body}`).join("\n")}
CTA: ${singleContent.cta}

Option B:
Hook: ${pipelineContent.hook}
Slides:
${pipelineContent.slides.map((s, i) => `Slide ${i + 1}: "${s.title}" — ${s.body}`).join("\n")}
CTA: ${pipelineContent.cta}

Compare them on:
- hook quality
- clarity
- audience fit
- engagement potential
- CTA alignment
- narrative flow across slides

Return ONLY valid JSON:
{
  "winner": "A" | "B" | "tie",
  "summary": "2-3 sentence explanation",
  "categoryWinners": {
    "hookQuality": "A" | "B" | "tie",
    "clarity": "A" | "B" | "tie",
    "audienceFit": "A" | "B" | "tie",
    "engagementPotential": "A" | "B" | "tie",
    "ctaAlignment": "A" | "B" | "tie",
    "narrativeFlow": "A" | "B" | "tie"
  }
}
`;

export const SCORING_PROMPT = (
  content: {
    hook: string;
    slides: Array<{ title: string; body: string }>;
    cta: string;
  },
  context?: {
    niche?: string;
    audience?: string;
    goal?: string;
    tone?: string;
  }
): string => `
You are a strict senior evaluator for Instagram carousel performance.

Evaluate the following carousel as if it were going into a real content product.

${context?.niche ? `Niche: ${context.niche}` : ""}
${context?.audience ? `Audience: ${context.audience}` : ""}
${context?.goal ? `Goal: ${context.goal}` : ""}
${context?.tone ? `Tone: ${context.tone}` : ""}

Content:
Hook: ${content.hook}
Slides:
${content.slides.map((s, i) => `Slide ${i + 1}: "${s.title}" — ${s.body}`).join("\n")}
CTA: ${content.cta}

Scoring rubric:
- hookStrength: Is the opening specific, sharp, and scroll-stopping?
- clarity: Is the message easy to understand quickly?
- audienceFit: Does it feel tailored to the target audience?
- engagementPotential: Would this likely hold attention and drive saves/shares/comments?
- ctaStrength: Is the CTA specific, natural, and aligned to the goal?

Scoring rules:
- Be strict. Do NOT give high scores unless clearly deserved.
- 5 = average
- 7 = good
- 8 = strong
- 9 = excellent
- 10 = exceptional and rare
- Penalize generic wording, repetition, weak progression, vague takeaways, and weak CTA alignment.
- Use integer scores only (1-10). Do not return fractions, ranges, or "x/10" strings.
- Use the full range when deserved; do not force symmetric scores across dimensions.
- If one dimension is clearly better/worse than others, reflect that difference numerically.

Return ONLY valid JSON in this exact format:
{
  "hookStrength": 0,
  "clarity": 0,
  "audienceFit": 0,
  "engagementPotential": 0,
  "ctaStrength": 0,
  "rationales": {
    "hookStrength": "one concise sentence",
    "clarity": "one concise sentence",
    "audienceFit": "one concise sentence",
    "engagementPotential": "one concise sentence",
    "ctaStrength": "one concise sentence"
  }
}
`;
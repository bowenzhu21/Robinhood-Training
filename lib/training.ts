export const PASSING_SCORE = 80;
export const RUBRIC_SCORE_MAX = 5;

export const RUBRIC_SCORE_KEYS = [
  "empathy",
  "professionalism",
  "clarity",
  "factual_accuracy",
  "next_step_clarity"
] as const;

export type RubricScoreKey = (typeof RUBRIC_SCORE_KEYS)[number];
export type RubricScores = Record<RubricScoreKey, number>;

export const RUBRIC_SCORE_LABELS: Record<RubricScoreKey, string> = {
  empathy: "Empathy",
  professionalism: "Professionalism",
  clarity: "Clarity",
  factual_accuracy: "Accuracy",
  next_step_clarity: "Next Step"
};

export function emptyRubricScores(): RubricScores {
  return {
    empathy: 0,
    professionalism: 0,
    clarity: 0,
    factual_accuracy: 0,
    next_step_clarity: 0
  };
}

export function normalizeRubricScores(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const normalized = emptyRubricScores();
  let hasKnownKey = false;

  for (const key of RUBRIC_SCORE_KEYS) {
    const rawScore = candidate[key];

    if (rawScore === undefined) {
      continue;
    }

    const parsedScore = Number(rawScore);

    if (!Number.isFinite(parsedScore)) {
      continue;
    }

    normalized[key] = Math.max(0, Math.min(RUBRIC_SCORE_MAX, parsedScore));
    hasKnownKey = true;
  }

  return hasKnownKey ? normalized : null;
}

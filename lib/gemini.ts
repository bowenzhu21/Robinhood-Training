import { z } from "zod";

import { env } from "@/lib/env";
import type { GradeResult } from "@/lib/types";

const gradeSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  rubric_scores: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])),
  strengths: z.array(z.string()),
  missed_points: z.array(z.string()),
  feedback_to_agent: z.string(),
  ideal_rewrite: z.string()
});

type GradeInput = {
  questionText: string;
  benchmarkAnswer: string;
  rubric: string[];
  traineeAnswer: string;
};

const fallbackInvalidJsonResult: GradeResult = {
  score: 0,
  passed: false,
  rubric_scores: {},
  strengths: [],
  missed_points: [],
  feedback_to_agent:
    "We could not fully grade this response just now because the AI grader returned an invalid result. Please review your answer and try submitting again.",
  ideal_rewrite:
    "Thanks for your patience. I understand the issue and I’m sorry for the frustration. I’ll review the details carefully, confirm the relevant information, and outline the next best step clearly."
};

function buildPrompt(input: GradeInput) {
  return [
    "System prompt:",
    "",
    "You are grading a customer service trainee.",
    "",
    "Evaluate the trainee response against:",
    "1. the question",
    "2. the benchmark answer",
    "3. the rubric criteria",
    "",
    "Grade fairly.",
    "Do not punish different wording if the meaning is correct.",
    "Prioritize empathy, clarity, accuracy, professionalism, and clear next steps.",
    "",
    "Return valid JSON only with this exact shape:",
    JSON.stringify({
      score: 0,
      passed: true,
      rubric_scores: {},
      strengths: [],
      missed_points: [],
      feedback_to_agent: "",
      ideal_rewrite: ""
    }),
    "",
    "Use a simple pass threshold like:",
    "",
    "80 and up = pass",
    "",
    "User payload:",
    "",
    "Question:",
    input.questionText,
    "",
    "Benchmark answer:",
    input.benchmarkAnswer,
    "",
    "Rubric:",
    JSON.stringify(input.rubric),
    "",
    "Trainee answer:",
    input.traineeAnswer
  ].join("\n");
}

function extractCandidateText(payload: unknown) {
  const response = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  return response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function safeParseGradeResult(rawText: string) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return gradeSchema.safeParse(parsed);
  } catch {
    return {
      success: false as const,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Gemini returned invalid JSON"
        }
      ])
    };
  }
}

export async function gradeWithGemini(input: GradeInput): Promise<GradeResult> {
  const prompt = buildPrompt(input);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini grading request failed with status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as unknown;
  const rawText = extractCandidateText(data);

  if (!rawText) {
    throw new Error("Gemini returned an empty grading response");
  }

  const parsed = safeParseGradeResult(rawText);

  if (!parsed.success) {
    console.error("Gemini returned invalid grading JSON", {
      issues: parsed.error.issues,
      rawText
    });
    return fallbackInvalidJsonResult;
  }

  return {
    ...parsed.data,
    passed: parsed.data.score >= 80
  };
}

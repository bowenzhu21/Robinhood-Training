import { cache } from "react";

import { PASSING_SCORE, emptyRubricScores, normalizeRubricScores } from "@/lib/training";
import { average } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  DashboardModule,
  ModuleLibraryItem,
  ModuleRecord,
  QuestionRecord,
  TrainingAttemptRecord
} from "@/lib/types";

export const getModules = cache(async (): Promise<ModuleRecord[]> => {
  const { data, error } = await supabaseAdmin
    .from("modules")
    .select("id, title, description")
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to load modules: ${error.message}`);
  }

  return ((data ?? []) as Array<{ id: string; title: string; description: string | null }>).map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description ?? "",
    category: null,
    difficulty: null
  }));
});

export async function getQuestionsByModule(moduleId: string): Promise<QuestionRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("id, module_id, question_text, benchmark_answer, rubric, order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to load questions: ${error.message}`);
  }

  return (
    (data ?? []) as Array<{
      id: string;
      module_id: string;
      question_text: string;
      benchmark_answer: string;
      rubric: string[];
      order_index: number | null;
    }>
  ).map((question, index) => ({
    ...question,
    order_index: question.order_index ?? index,
    difficulty: null
  }));
}

function buildGradeResultFromAttemptRow(row: Record<string, unknown>, score: number, passed: boolean) {
  const strengths = Array.isArray(row.strengths)
    ? row.strengths.filter((item): item is string => typeof item === "string")
    : [];
  const missedPoints = Array.isArray(row.missed_points)
    ? row.missed_points.filter((item): item is string => typeof item === "string")
    : [];
  const feedbackToAgent = typeof row.feedback_to_agent === "string" ? row.feedback_to_agent : "";
  const idealRewrite = typeof row.ideal_rewrite === "string" ? row.ideal_rewrite : "";
  const rubricScores = normalizeRubricScores(row.rubric_scores);

  if (!strengths.length && !missedPoints.length && !feedbackToAgent && !idealRewrite && !rubricScores) {
    return null;
  }

  return {
    score,
    passed,
    rubric_scores: rubricScores ?? emptyRubricScores(),
    strengths,
    missed_points: missedPoints,
    feedback_to_agent: feedbackToAgent,
    ideal_rewrite: idealRewrite
  };
}

async function loadAttemptRowsForModule(userId: string, moduleId: string) {
  const { data: moduleQuestions, error: moduleQuestionsError } = await supabaseAdmin
    .from("questions")
    .select("id")
    .eq("module_id", moduleId);

  if (moduleQuestionsError) {
    throw new Error(`Failed to load module questions: ${moduleQuestionsError.message}`);
  }

  const questionIds = (moduleQuestions ?? []).map((question) => String(question.id));

  if (!questionIds.length) {
    return [];
  }

  const attemptSelections = [
    "question_id, score, passed, rubric_scores, strengths, missed_points, feedback_to_agent, ideal_rewrite, response_text, trainee_answer, created_at",
    "question_id, score, passed, rubric_scores, strengths, missed_points, feedback_to_agent, ideal_rewrite, created_at",
    "question_id, score, passed, response_text, trainee_answer, created_at",
    "question_id, score, passed, response_text, created_at",
    "question_id, score, created_at"
  ];

  let lastErrorMessage = "unknown error";

  for (const selection of attemptSelections) {
    const { data, error } = await supabaseAdmin
      .from("attempts")
      .select(selection)
      .eq("user_id", userId)
      .in("question_id", questionIds)
      .order("created_at", { ascending: false });

    if (!error) {
      return ((data ?? []) as unknown) as Array<Record<string, unknown>>;
    }

    lastErrorMessage = error.message;
  }

  throw new Error(`Failed to load attempts: ${lastErrorMessage}`);
}

export async function getAttemptHistoryForModule(userId: string, moduleId: string): Promise<TrainingAttemptRecord[]> {
  const rows = await loadAttemptRowsForModule(userId, moduleId);

  return rows.map((row) => {
    const score = Number(row.score ?? 0);
    const passed = typeof row.passed === "boolean" ? row.passed : score >= PASSING_SCORE;

    return {
      question_id: String(row.question_id),
      score,
      passed,
      result: buildGradeResultFromAttemptRow(row, score, passed),
      response_text:
        typeof row.response_text === "string"
          ? row.response_text
          : typeof row.trainee_answer === "string"
            ? row.trainee_answer
            : null,
      created_at: typeof row.created_at === "string" ? row.created_at : null
    };
  });
}

export async function getLatestAttemptsForModule(userId: string, moduleId: string): Promise<TrainingAttemptRecord[]> {
  const rows = await getAttemptHistoryForModule(userId, moduleId);
  const latestByQuestion = new Map<string, TrainingAttemptRecord>();

  for (const row of rows) {
    const questionId = row.question_id;

    if (!latestByQuestion.has(questionId)) {
      latestByQuestion.set(questionId, row);
    }
  }

  return Array.from(latestByQuestion.values());
}

export async function getDashboardModules(userId: string): Promise<DashboardModule[]> {
  const [modules, questionsResult, attemptsResult] = await Promise.all([
    getModules(),
    supabaseAdmin.from("questions").select("id, module_id"),
    supabaseAdmin.from("attempts").select("question_id, score, created_at").eq("user_id", userId)
  ]);

  if (questionsResult.error) {
    throw new Error(`Failed to load questions: ${questionsResult.error.message}`);
  }

  if (attemptsResult.error) {
    throw new Error(`Failed to load attempt scores: ${attemptsResult.error.message}`);
  }

  const questionCounts = new Map<string, number>();
  const moduleIdByQuestionId = new Map<string, string>();
  for (const question of questionsResult.data ?? []) {
    const moduleId = question.module_id as string;
    const questionId = question.id as string;
    questionCounts.set(moduleId, (questionCounts.get(moduleId) ?? 0) + 1);
    moduleIdByQuestionId.set(questionId, moduleId);
  }

  const latestAttemptsByModule = new Map<
    string,
    Map<
      string,
      {
        score: number;
        passed: boolean;
      }
    >
  >();

  for (const attempt of attemptsResult.data ?? []) {
    const questionId = attempt.question_id as string;
    const moduleId = moduleIdByQuestionId.get(questionId);

    if (!moduleId) {
      continue;
    }

    const score = Number(attempt.score);
    const moduleAttempts = latestAttemptsByModule.get(moduleId) ?? new Map();
    const existing = moduleAttempts.get(questionId);

    moduleAttempts.set(questionId, {
      score: existing ? Math.max(existing.score, score) : score,
      passed: Boolean(existing?.passed) || score >= PASSING_SCORE
    });

    latestAttemptsByModule.set(moduleId, moduleAttempts);
  }

  return modules.map((module) => {
    const totalQuestions = questionCounts.get(module.id) ?? 0;
    const latestAttempts = latestAttemptsByModule.get(module.id) ?? new Map();
    const completedQuestions = Array.from(latestAttempts.values()).filter((attempt) => attempt.passed).length;
    const averageScore = average(Array.from(latestAttempts.values()).map((attempt) => attempt.score));
    const status = completedQuestions === 0 ? "not_started" : completedQuestions >= totalQuestions ? "completed" : "in_progress";

    return {
      ...module,
      totalQuestions,
      completedQuestions,
      averageScore,
      status,
      resumeQuestionId: null
    };
  });
}

export async function getModuleLibrary(): Promise<ModuleLibraryItem[]> {
  const [modules, questionsResult] = await Promise.all([
    getModules(),
    supabaseAdmin.from("questions").select("id, module_id")
  ]);

  if (questionsResult.error) {
    throw new Error(`Failed to load questions: ${questionsResult.error.message}`);
  }

  const questionCounts = new Map<string, number>();
  for (const question of questionsResult.data ?? []) {
    const moduleId = question.module_id as string;
    questionCounts.set(moduleId, (questionCounts.get(moduleId) ?? 0) + 1);
  }

  return modules.map((module) => ({
    ...module,
    totalQuestions: questionCounts.get(module.id) ?? 0
  }));
}

export async function getDashboardSummary(userId: string) {
  const modules = await getDashboardModules(userId);
  const totalQuestions = modules.reduce((sum, module) => sum + module.totalQuestions, 0);
  const completedQuestions = modules.reduce((sum, module) => sum + module.completedQuestions, 0);
  const scores = modules
    .map((module) => module.averageScore)
    .filter((value): value is number => value !== null);

  return {
    modules,
    totalQuestions,
    completedQuestions,
    completionRate: totalQuestions ? (completedQuestions / totalQuestions) * 100 : 0,
    averageScore: average(scores)
  };
}

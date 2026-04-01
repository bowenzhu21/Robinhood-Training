import { cache } from "react";

import { average } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  AttemptRecord,
  DashboardModule,
  ModuleProgressRecord,
  ModuleRecord,
  QuestionRecord
} from "@/lib/types";

export const getModules = cache(async (): Promise<ModuleRecord[]> => {
  const { data, error } = await supabaseAdmin
    .from("modules")
    .select("id, title, description, category, difficulty")
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to load modules: ${error.message}`);
  }

  return (data ?? []) as ModuleRecord[];
});

export async function getQuestionsByModule(moduleId: string): Promise<QuestionRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("id, module_id, question_text, benchmark_answer, rubric, order_index, difficulty")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to load questions: ${error.message}`);
  }

  return ((data ?? []) as QuestionRecord[]).map((question, index) => ({
    ...question,
    order_index: question.order_index ?? index
  }));
}

export async function getLatestAttemptsForModule(userId: string, moduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select(
      "id, user_id, module_id, question_id, trainee_answer, score, passed, rubric_scores, strengths, missed_points, feedback_to_agent, ideal_rewrite, created_at"
    )
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load attempts: ${error.message}`);
  }

  const latestByQuestion = new Map<string, AttemptRecord>();

  for (const attempt of (data ?? []) as AttemptRecord[]) {
    if (!latestByQuestion.has(attempt.question_id)) {
      latestByQuestion.set(attempt.question_id, attempt);
    }
  }

  return Array.from(latestByQuestion.values());
}

export async function getDashboardModules(userId: string): Promise<DashboardModule[]> {
  const [modules, questionsResult, progressResult, attemptsResult] = await Promise.all([
    getModules(),
    supabaseAdmin.from("questions").select("id, module_id"),
    supabaseAdmin
      .from("module_progress")
      .select(
        "user_id, module_id, completed_questions, total_questions, average_score, last_question_id, status, last_attempted_at, completed_at"
      )
      .eq("user_id", userId),
    supabaseAdmin.from("attempts").select("module_id, score").eq("user_id", userId)
  ]);

  if (questionsResult.error) {
    throw new Error(`Failed to load questions: ${questionsResult.error.message}`);
  }

  if (progressResult.error) {
    throw new Error(`Failed to load module progress: ${progressResult.error.message}`);
  }

  if (attemptsResult.error) {
    throw new Error(`Failed to load attempt scores: ${attemptsResult.error.message}`);
  }

  const questionCounts = new Map<string, number>();
  for (const question of questionsResult.data ?? []) {
    const moduleId = question.module_id as string;
    questionCounts.set(moduleId, (questionCounts.get(moduleId) ?? 0) + 1);
  }

  const progressByModule = new Map<string, ModuleProgressRecord>();
  for (const progress of (progressResult.data ?? []) as ModuleProgressRecord[]) {
    progressByModule.set(progress.module_id, progress);
  }

  const scoresByModule = new Map<string, number[]>();
  for (const attempt of attemptsResult.data ?? []) {
    const moduleId = attempt.module_id as string;
    const score = Number(attempt.score);
    const scores = scoresByModule.get(moduleId) ?? [];
    scores.push(score);
    scoresByModule.set(moduleId, scores);
  }

  return modules.map((module) => {
    const progress = progressByModule.get(module.id);
    const totalQuestions = questionCounts.get(module.id) ?? 0;

    return {
      ...module,
      totalQuestions,
      completedQuestions: progress?.completed_questions ?? 0,
      averageScore: progress?.average_score ?? average(scoresByModule.get(module.id) ?? []),
      status: progress?.status ?? "not_started",
      resumeQuestionId: progress?.last_question_id ?? null
    };
  });
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

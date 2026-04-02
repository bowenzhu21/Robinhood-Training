import { cache } from "react";

import { average } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  AttemptRecord,
  DashboardModule,
  ModuleLibraryItem,
  ModuleRecord,
  QuestionRecord
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

export async function getLatestAttemptsForModule(userId: string, moduleId: string) {
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

  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select("question_id, created_at")
    .eq("user_id", userId)
    .in("question_id", questionIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load attempts: ${error.message}`);
  }

  const latestByQuestion = new Map<
    string,
    {
      question_id: string;
      created_at: string | null;
    }
  >();

  for (const attempt of (data ?? []) as Array<{ question_id: string; created_at: string | null }>) {
    if (!latestByQuestion.has(attempt.question_id)) {
      latestByQuestion.set(attempt.question_id, attempt);
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
        createdAt: string | null;
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
    const createdAt = typeof attempt.created_at === "string" ? attempt.created_at : null;
    const moduleAttempts = latestAttemptsByModule.get(moduleId) ?? new Map();
    const existing = moduleAttempts.get(questionId);

    if (!existing || (createdAt && (!existing.createdAt || createdAt > existing.createdAt))) {
      moduleAttempts.set(questionId, { score, createdAt });
    }

    latestAttemptsByModule.set(moduleId, moduleAttempts);
  }

  return modules.map((module) => {
    const totalQuestions = questionCounts.get(module.id) ?? 0;
    const latestAttempts = latestAttemptsByModule.get(module.id) ?? new Map();
    const completedQuestions = latestAttempts.size;
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

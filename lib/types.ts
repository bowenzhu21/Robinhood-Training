import type { RubricScores } from "@/lib/training";

export type QuestionRecord = {
  id: string;
  module_id: string;
  question_text: string;
  benchmark_answer: string;
  rubric: string[];
  order_index: number;
  difficulty: string | null;
};

export type ModuleRecord = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  difficulty: string | null;
};

export type AttemptRecord = {
  id: string;
  user_id: string;
  module_id: string;
  question_id: string;
  trainee_answer: string;
  score: number;
  passed: boolean;
  rubric_scores: RubricScores;
  strengths: string[];
  missed_points: string[];
  feedback_to_agent: string;
  ideal_rewrite: string;
  created_at: string;
};

export type ModuleProgressRecord = {
  user_id: string;
  module_id: string;
  completed_questions?: number;
  total_questions?: number;
  average_score?: number | null;
  last_question_id?: string | null;
  status?: "not_started" | "in_progress" | "completed";
  last_attempted_at?: string | null;
  completed_at?: string | null;
};

export type DashboardModule = ModuleRecord & {
  totalQuestions: number;
  completedQuestions: number;
  averageScore: number | null;
  status: ModuleProgressRecord["status"];
  resumeQuestionId: string | null;
};

export type ModuleLibraryItem = ModuleRecord & {
  totalQuestions: number;
};

export type GradeResult = {
  score: number;
  passed: boolean;
  rubric_scores: RubricScores;
  strengths: string[];
  missed_points: string[];
  feedback_to_agent: string;
  ideal_rewrite: string;
};

export type TrainingAttemptRecord = {
  question_id: string;
  score: number;
  passed: boolean;
  result: GradeResult | null;
  response_text: string | null;
  created_at: string | null;
};

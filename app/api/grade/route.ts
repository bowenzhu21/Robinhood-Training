import { NextResponse } from "next/server";
import { z } from "zod";

import { gradeWithGemini } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { average } from "@/lib/utils";

const requestSchema = z.object({
  moduleId: z.string().uuid().or(z.string().min(1)),
  questionId: z.string().uuid().or(z.string().min(1)),
  traineeAnswer: z.string().min(1)
});

async function saveModuleProgress(input: {
  userId: string;
  moduleId: string;
  questionId: string;
  completedQuestions: number;
  totalQuestions: number;
  averageScore: number | null;
  status: "not_started" | "in_progress" | "completed";
}) {
  const timestamp = new Date().toISOString();

  const fullPayload = {
    user_id: input.userId,
    module_id: input.moduleId,
    completed_questions: input.completedQuestions,
    total_questions: input.totalQuestions,
    average_score: input.averageScore,
    last_question_id: input.questionId,
    status: input.status,
    last_attempted_at: timestamp,
    completed_at: input.status === "completed" ? timestamp : null
  };

  const { error: fullError } = await supabaseAdmin.from("module_progress").upsert(fullPayload, {
    onConflict: "user_id,module_id"
  });

  if (!fullError) {
    return;
  }

  const fallbackPayload = {
    user_id: input.userId,
    module_id: input.moduleId
  };

  const { error: fallbackError } = await supabaseAdmin.from("module_progress").upsert(fallbackPayload, {
    onConflict: "user_id,module_id"
  });

  if (!fallbackError) {
    console.warn("Module progress saved with minimal schema because optional progress columns were rejected.");
    return;
  }

  console.error("Failed to save module progress", {
    fullError,
    fallbackError
  });
}

async function saveAttempt(input: {
  userId: string;
  moduleId: string;
  questionId: string;
  traineeAnswer: string;
  result: ReturnType<typeof gradeWithGemini> extends Promise<infer T> ? T : never;
}) {
  const fullPayload = {
    user_id: input.userId,
    module_id: input.moduleId,
    question_id: input.questionId,
    trainee_answer: input.traineeAnswer,
    score: input.result.score,
    passed: input.result.passed,
    rubric_scores: input.result.rubric_scores,
    strengths: input.result.strengths,
    missed_points: input.result.missed_points,
    feedback_to_agent: input.result.feedback_to_agent,
    ideal_rewrite: input.result.ideal_rewrite
  };

  const fullInsert = await supabaseAdmin.from("attempts").insert(fullPayload).select("id, question_id, score, passed").single();

  if (!fullInsert.error && fullInsert.data) {
    return fullInsert.data;
  }

  const fallbackPayload = {
    user_id: input.userId,
    question_id: input.questionId,
    trainee_answer: input.traineeAnswer,
    score: input.result.score,
    passed: input.result.passed
  };

  const fallbackInsert = await supabaseAdmin
    .from("attempts")
    .insert(fallbackPayload)
    .select("id, question_id, score, passed")
    .single();

  if (!fallbackInsert.error && fallbackInsert.data) {
    return fallbackInsert.data;
  }

  throw new Error(`Failed to save attempt: ${fallbackInsert.error?.message ?? fullInsert.error?.message ?? "unknown error"}`);
}

export async function POST(request: Request) {
  try {
    // Read the signed-in user from the server session so grading remains private.
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());

    // Load the real grading inputs from the database on the server.
    // Benchmark answers and rubric data never need to reach the browser.
    const { data: question, error: questionError } = await supabaseAdmin
      .from("questions")
      .select("id, module_id, question_text, benchmark_answer, rubric")
      .eq("id", body.questionId)
      .eq("module_id", body.moduleId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Gemini receives the four required grading inputs only on the server.
    const result = await gradeWithGemini({
      questionText: question.question_text as string,
      benchmarkAnswer: question.benchmark_answer as string,
      rubric: (question.rubric as string[]) ?? [],
      traineeAnswer: body.traineeAnswer
    });

    // Save every grading attempt so the trainee can review progress over time.
    const attempt = await saveAttempt({
      userId: user.id,
      moduleId: body.moduleId,
      questionId: body.questionId,
      traineeAnswer: body.traineeAnswer,
      result
    });

    const [{ data: moduleQuestions, error: moduleQuestionsError }, { count: totalQuestions, error: countError }] =
      await Promise.all([
        supabaseAdmin.from("questions").select("id").eq("module_id", body.moduleId),
        supabaseAdmin.from("questions").select("*", { count: "exact", head: true }).eq("module_id", body.moduleId)
      ]);

    if (moduleQuestionsError) {
      throw new Error(`Failed to load module questions: ${moduleQuestionsError.message}`);
    }

    if (countError) {
      throw new Error(`Failed to count questions: ${countError.message}`);
    }

    const questionIds = (moduleQuestions ?? []).map((item) => String(item.id));
    const { data: latestAttempts, error: attemptsError } = questionIds.length
      ? await supabaseAdmin
          .from("attempts")
          .select("question_id, score, created_at")
          .eq("user_id", user.id)
          .in("question_id", questionIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

    if (attemptsError) {
      throw new Error(`Failed to read attempts: ${attemptsError.message}`);
    }

    const latestByQuestion = new Map<string, number>();

    for (const latestAttempt of latestAttempts ?? []) {
      const questionId = latestAttempt.question_id as string;
      if (!latestByQuestion.has(questionId)) {
        latestByQuestion.set(questionId, Number(latestAttempt.score));
      }
    }

    const completedQuestions = latestByQuestion.size;
    const total = totalQuestions ?? 0;
    const averageScore = average(Array.from(latestByQuestion.values()));
    const status = completedQuestions === 0 ? "not_started" : completedQuestions >= total ? "completed" : "in_progress";

    // Save progress when possible, but do not fail grading if the progress table is a leaner MVP schema.
    await saveModuleProgress({
      userId: user.id,
      moduleId: body.moduleId,
      questionId: body.questionId,
      completedQuestions,
      totalQuestions: total,
      averageScore,
      status
    });

    return NextResponse.json({
      result,
      progress: {
        completedQuestions,
        totalQuestions: total,
        averageScore,
        status
      },
      attempt: {
        questionId: attempt.question_id as string,
        score: Number(attempt.score),
        passed: Boolean(attempt.passed)
      }
    });
  } catch (error) {
    console.error(error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    return NextResponse.json({ error: "We could not grade this response right now. Please try again." }, { status: 500 });
  }
}

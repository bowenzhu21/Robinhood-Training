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

    const attemptPayload = {
      user_id: user.id,
      module_id: body.moduleId,
      question_id: body.questionId,
      trainee_answer: body.traineeAnswer,
      score: result.score,
      passed: result.passed,
      rubric_scores: result.rubric_scores,
      strengths: result.strengths,
      missed_points: result.missed_points,
      feedback_to_agent: result.feedback_to_agent,
      ideal_rewrite: result.ideal_rewrite
    };

    // Save every grading attempt so the trainee can review progress over time.
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .insert(attemptPayload)
      .select("id, question_id, score, passed")
      .single();

    if (attemptError) {
      throw new Error(`Failed to save attempt: ${attemptError.message}`);
    }

    const [{ data: latestAttempts, error: attemptsError }, { count: totalQuestions, error: countError }] =
      await Promise.all([
        supabaseAdmin
          .from("attempts")
          .select("question_id, score, created_at")
          .eq("user_id", user.id)
          .eq("module_id", body.moduleId)
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("questions").select("*", { count: "exact", head: true }).eq("module_id", body.moduleId)
      ]);

    if (attemptsError) {
      throw new Error(`Failed to read attempts: ${attemptsError.message}`);
    }

    if (countError) {
      throw new Error(`Failed to count questions: ${countError.message}`);
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

    // Upsert module-level progress so the dashboard can show resume state and averages.
    const { error: progressError } = await supabaseAdmin.from("module_progress").upsert(
      {
        user_id: user.id,
        module_id: body.moduleId,
        completed_questions: completedQuestions,
        total_questions: total,
        average_score: averageScore,
        last_question_id: body.questionId,
        status,
        last_attempted_at: new Date().toISOString(),
        completed_at: status === "completed" ? new Date().toISOString() : null
      },
      {
        onConflict: "user_id,module_id"
      }
    );

    if (progressError) {
      throw new Error(`Failed to save progress: ${progressError.message}`);
    }

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

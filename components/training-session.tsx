"use client";

import { useMemo, useState } from "react";

import type { GradeResult, QuestionRecord } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

type SavedAttempt = {
  questionId: string;
  score: number;
  passed: boolean;
};

type TrainingSessionProps = {
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string;
  questions: QuestionRecord[];
  initialQuestionIndex: number;
  completedQuestionIds: string[];
};

type GradeApiResponse = {
  result: GradeResult;
  progress: {
    completedQuestions: number;
    totalQuestions: number;
    averageScore: number | null;
    status: "not_started" | "in_progress" | "completed";
  };
  attempt: SavedAttempt;
};

export function TrainingSession({
  moduleId,
  moduleTitle,
  moduleDescription,
  questions,
  initialQuestionIndex,
  completedQuestionIds
}: TrainingSessionProps) {
  const [questionIndex, setQuestionIndex] = useState(initialQuestionIndex);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [attempts, setAttempts] = useState<SavedAttempt[]>(
    completedQuestionIds.map((questionId) => ({
      questionId,
      score: 0,
      passed: false
    }))
  );
  const [progress, setProgress] = useState({
    completedQuestions: completedQuestionIds.length,
    totalQuestions: questions.length,
    averageScore: null as number | null,
    status: (completedQuestionIds.length === questions.length ? "completed" : completedQuestionIds.length ? "in_progress" : "not_started") as
      | "not_started"
      | "in_progress"
      | "completed"
  });

  const question = questions[questionIndex];
  const progressPercent = progress.totalQuestions
    ? (progress.completedQuestions / progress.totalQuestions) * 100
    : 0;
  const isFirstQuestion = questionIndex === 0;
  const isLastQuestion = questionIndex === questions.length - 1;
  const passedResult = result?.passed ?? false;
  const resultContainerClassName = passedResult
    ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(151,255,111,0.06),rgba(255,255,255,0.015))]"
    : "border-[rgba(255,141,141,0.2)] bg-[linear-gradient(180deg,rgba(255,141,141,0.1),rgba(255,255,255,0.015))]";
  const resultPanelClassName = passedResult
    ? "subtle-panel rounded-[1.5rem] p-5"
    : "rounded-[1.5rem] border border-[rgba(255,141,141,0.12)] bg-[linear-gradient(180deg,rgba(255,141,141,0.06),rgba(255,255,255,0.015))] p-5";
  const resultRewriteClassName = passedResult
    ? "mt-3 rounded-[1.5rem] border border-white/8 bg-black/20 p-5 text-sm leading-7 text-white"
    : "mt-3 rounded-[1.5rem] border border-[rgba(255,141,141,0.14)] bg-[linear-gradient(180deg,rgba(255,141,141,0.06),rgba(0,0,0,0.18))] p-5 text-sm leading-7 text-white";
  const resultScoreBadgeClassName = passedResult
    ? "rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
    : "rounded-full border border-[rgba(255,141,141,0.16)] bg-[rgba(255,141,141,0.08)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#ffd2d2]";
  const resultStatusBadgeClassName = passedResult
    ? "accent-button bg-[var(--accent)]"
    : "border border-[rgba(255,141,141,0.22)] bg-[rgba(255,141,141,0.12)] text-[#ffe1e1]";

  const currentAttempt = useMemo(
    () => attempts.find((attempt) => attempt.questionId === question.id),
    [attempts, question.id]
  );

  async function submitAnswer() {
    if (!answer.trim()) {
      setError("Enter a response before submitting.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          moduleId,
          questionId: question.id,
          traineeAnswer: answer
        })
      });

      const payload = (await response.json()) as GradeApiResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Failed to grade response");
      }

      if (!("result" in payload)) {
        throw new Error("Invalid grading response");
      }

      setResult(payload.result);
      setProgress(payload.progress);
      setAttempts((current) => {
        const remaining = current.filter((attempt) => attempt.questionId !== payload.attempt.questionId);
        return [...remaining, payload.attempt];
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goToNextQuestion() {
    if (isLastQuestion) {
      return;
    }

    setQuestionIndex((current) => current + 1);
    setAnswer("");
    setResult(null);
    setError(null);
  }

  function goToPreviousQuestion() {
    if (isFirstQuestion) {
      return;
    }

    setQuestionIndex((current) => current - 1);
    setAnswer("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      <section className="card card-module rounded-[2.25rem] p-8 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="eyebrow">Training Module</p>
            <div className="space-y-3">
              <h1 className="headline text-4xl sm:text-5xl">{moduleTitle}</h1>
              <p className="max-w-3xl text-base leading-8 text-[var(--muted)]">{moduleDescription}</p>
            </div>
          </div>

          <div className="subtle-panel min-w-[260px] rounded-[1.75rem] p-6">
            <p className="eyebrow">Module Progress</p>
            <p className="headline mt-4 text-4xl">{formatPercent(progressPercent)}</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-strong),var(--accent))]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="card card-soft rounded-[2.1rem] p-8 sm:p-9">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
              Question {questionIndex + 1} of {questions.length}
            </p>
            {currentAttempt ? (
              <span className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-xs text-[var(--muted)]">
                Previously submitted
              </span>
            ) : null}
          </div>

          <p className="mt-10 max-w-3xl text-[1.55rem] leading-10 text-white">{question.question_text}</p>

          <label className="mt-10 block space-y-3">
            <span className="text-sm text-[var(--muted)]">Your response</span>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={9}
              placeholder="Write the response you would send to the customer."
              className="min-h-[240px] w-full rounded-[1.6rem] border border-white/8 bg-black/20 px-5 py-4 text-base leading-8 outline-none transition placeholder:text-white/20 focus:border-[var(--border-strong)]"
            />
          </label>

          {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading || isFirstQuestion}
              onClick={goToPreviousQuestion}
              className="rounded-full border border-white/8 bg-white/[0.02] px-5 py-3.5 text-sm text-white transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Previous question
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={submitAnswer}
              className="accent-button accent-glow rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-5 py-3.5 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Grading..." : "Submit for grading"}
            </button>

            {(result || currentAttempt) && !isLastQuestion ? (
              <button
                type="button"
                onClick={goToNextQuestion}
                className="rounded-full border border-white/8 bg-white/[0.02] px-5 py-3.5 text-sm text-white transition hover:border-[var(--border-strong)]"
              >
                Next question
              </button>
            ) : null}
          </div>

          {result ? (
            <div className={`mt-10 rounded-[1.9rem] border p-6 sm:p-7 ${resultContainerClassName}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={resultScoreBadgeClassName}>
                  Score {Math.round(result.score)}/100
                </span>
                <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${resultStatusBadgeClassName}`}>
                  {result.passed ? "Passed" : "Needs work"}
                </span>
              </div>

              <div className="mt-7 grid gap-6 lg:grid-cols-2">
                <div className={resultPanelClassName}>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Strengths</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-white">
                    {result.strengths.map((strength) => (
                      <li key={strength}>- {strength}</li>
                    ))}
                  </ul>
                </div>
                <div className={resultPanelClassName}>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Missed points</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-white">
                    {result.missed_points.map((missedPoint) => (
                      <li key={missedPoint}>- {missedPoint}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Feedback</p>
                  <p className="mt-3 text-sm leading-7 text-white/95">{result.feedback_to_agent}</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Ideal rewrite</p>
                  <p className={resultRewriteClassName}>
                    {result.ideal_rewrite}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="card card-stat rounded-[2rem] p-6">
            <p className="eyebrow">Questions</p>
            <div className="mt-5 space-y-3">
              {questions.map((item, index) => {
                const submitted = attempts.some((attempt) => attempt.questionId === item.id);
                const active = index === questionIndex;

                return (
                  <div
                    key={item.id}
                    className={`rounded-[1.35rem] border px-4 py-4 text-sm ${
                      active
                        ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-white"
                        : submitted
                          ? "border-white/8 bg-white/[0.02] text-white"
                          : "border-white/6 text-[var(--muted)]"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]">Question {index + 1}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-stat rounded-[2rem] p-6">
            <p className="eyebrow">Status</p>
            <p className="headline mt-4 text-3xl capitalize">{progress.status.replace("_", " ")}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {progress.completedQuestions} of {progress.totalQuestions} questions completed
            </p>
            <p className="mt-7 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Average Score</p>
            <p className="headline mt-3 text-3xl">
              {progress.averageScore === null ? "No score yet" : `${Math.round(progress.averageScore)}/100`}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

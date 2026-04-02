"use client";

import { useEffect, useMemo, useState } from "react";

import { PASSING_SCORE, RUBRIC_SCORE_KEYS, RUBRIC_SCORE_LABELS, RUBRIC_SCORE_MAX } from "@/lib/training";
import type { GradeResult } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

type TrainingQuestion = {
  id: string;
  question_text: string;
  order_index: number;
};

type SavedAttempt = {
  questionId: string;
  score: number;
  passed: boolean;
  result: GradeResult | null;
  responseText: string | null;
  createdAt: string | null;
};

type TrainingSessionProps = {
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string;
  questions: TrainingQuestion[];
  initialQuestionIndex: number;
  initialAttempts: SavedAttempt[];
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

function getAttemptStorageKey(moduleId: string) {
  return `training-attempt-history:${moduleId}`;
}

function getAttemptKey(attempt: SavedAttempt) {
  return `${attempt.questionId}:${attempt.createdAt ?? "no-date"}:${attempt.score}`;
}

function mergeAttempts(primary: SavedAttempt[], secondary: SavedAttempt[]) {
  const merged = new Map<string, SavedAttempt>();

  for (const attempt of [...primary, ...secondary]) {
    const key = getAttemptKey(attempt);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, attempt);
      continue;
    }

    merged.set(key, {
      ...existing,
      ...attempt,
      result: existing.result ?? attempt.result,
      responseText: existing.responseText ?? attempt.responseText,
      createdAt: existing.createdAt ?? attempt.createdAt
    });
  }

  return Array.from(merged.values()).sort(compareAttemptDatesDescending);
}

function buildLatestAttemptMap(attempts: SavedAttempt[]) {
  const latestByQuestion = new Map<string, SavedAttempt>();

  for (const attempt of attempts) {
    if (!latestByQuestion.has(attempt.questionId)) {
      latestByQuestion.set(attempt.questionId, attempt);
    }
  }

  return latestByQuestion;
}

function buildBestScoreMap(attempts: SavedAttempt[]) {
  const bestScoreByQuestion = new Map<string, number>();

  for (const attempt of attempts) {
    const existingScore = bestScoreByQuestion.get(attempt.questionId);
    bestScoreByQuestion.set(
      attempt.questionId,
      existingScore === undefined ? attempt.score : Math.max(existingScore, attempt.score)
    );
  }

  return bestScoreByQuestion;
}

function formatRubricScore(score: number) {
  return Number.isInteger(score) ? `${score}` : score.toFixed(1);
}

function compareAttemptDatesAscending(left: SavedAttempt, right: SavedAttempt) {
  const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

  return leftTime - rightTime;
}

function compareAttemptDatesDescending(left: SavedAttempt, right: SavedAttempt) {
  return compareAttemptDatesAscending(right, left);
}

export function TrainingSession({
  moduleId,
  moduleTitle,
  moduleDescription,
  questions,
  initialQuestionIndex,
  initialAttempts
}: TrainingSessionProps) {
  const initialPassedQuestionIds = new Set(initialAttempts.filter((attempt) => attempt.passed).map((attempt) => attempt.questionId));
  const initialCompletedQuestions = initialPassedQuestionIds.size;
  const initialBestScores = Array.from(buildBestScoreMap(initialAttempts).values());
  const initialAverageScore = initialBestScores.length
    ? initialBestScores.reduce((total, score) => total + score, 0) / initialBestScores.length
    : null;
  const initialCurrentQuestionId = questions[initialQuestionIndex]?.id ?? "";
  const initialCurrentAttempt = buildLatestAttemptMap(initialAttempts).get(initialCurrentQuestionId) ?? null;

  const [questionIndex, setQuestionIndex] = useState(initialQuestionIndex);
  const [answer, setAnswer] = useState(initialCurrentAttempt?.responseText ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(initialCurrentAttempt?.result ?? null);
  const [attemptHistory, setAttemptHistory] = useState<SavedAttempt[]>(initialAttempts);
  const [selectedAttemptKey, setSelectedAttemptKey] = useState<string | null>(
    initialCurrentAttempt ? getAttemptKey(initialCurrentAttempt) : null
  );
  const [progress, setProgress] = useState({
    completedQuestions: initialCompletedQuestions,
    totalQuestions: questions.length,
    averageScore: initialAverageScore,
    status: (
      initialCompletedQuestions === questions.length
        ? "completed"
        : initialCompletedQuestions
          ? "in_progress"
          : "not_started"
    ) as
      | "not_started"
      | "in_progress"
      | "completed"
  });

  const question = questions[questionIndex];
  const latestAttemptsByQuestion = useMemo(() => buildLatestAttemptMap(attemptHistory), [attemptHistory]);
  const passedQuestionIds = useMemo(
    () => new Set(attemptHistory.filter((attempt) => attempt.passed).map((attempt) => attempt.questionId)),
    [attemptHistory]
  );
  const progressPercent = progress.totalQuestions
    ? (progress.completedQuestions / progress.totalQuestions) * 100
    : 0;
  const isFirstQuestion = questionIndex === 0;
  const isLastQuestion = questionIndex === questions.length - 1;
  const currentAttempt = latestAttemptsByQuestion.get(question.id) ?? null;
  const currentQuestionHistoryNewestFirst = useMemo(
    () => attemptHistory.filter((attempt) => attempt.questionId === question.id),
    [attemptHistory, question.id]
  );
  const selectedAttempt =
    currentQuestionHistoryNewestFirst.find((attempt) => getAttemptKey(attempt) === selectedAttemptKey) ?? null;
  const hasCurrentSubmission = Boolean(result || currentAttempt);
  const hasPassedCurrentQuestion = Boolean(result?.passed || passedQuestionIds.has(question.id));
  const canAdvanceToNextQuestion = !isLastQuestion && hasPassedCurrentQuestion;
  const nextQuestionLocked = hasCurrentSubmission && !hasPassedCurrentQuestion && !isLastQuestion;
  const activeAttempt = selectedAttempt ?? currentAttempt;
  const displayResult = result ?? activeAttempt?.result ?? null;
  const displayResultPassed = displayResult?.passed ?? false;
  const currentQuestionHistory = useMemo(
    () => [...currentQuestionHistoryNewestFirst].sort(compareAttemptDatesAscending),
    [currentQuestionHistoryNewestFirst]
  );
  const failedAttemptsCount = currentQuestionHistory.filter((attempt) => !attempt.passed).length;
  const canRevealTeachingMaterials = hasPassedCurrentQuestion || failedAttemptsCount >= 2;
  const firstUnpassedIndex = useMemo(() => {
    const nextIndex = questions.findIndex((item) => !passedQuestionIds.has(item.id));

    return nextIndex === -1 ? questions.length - 1 : nextIndex;
  }, [questions, passedQuestionIds]);

  const displayResultContainerClassName = displayResultPassed
    ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(151,255,111,0.06),rgba(255,255,255,0.015))]"
    : "border-[rgba(255,141,141,0.2)] bg-[linear-gradient(180deg,rgba(255,141,141,0.1),rgba(255,255,255,0.015))]";
  const displayResultPanelClassName = displayResultPassed
    ? "subtle-panel rounded-[1.5rem] p-5"
    : "rounded-[1.5rem] border border-[rgba(255,141,141,0.12)] bg-[linear-gradient(180deg,rgba(255,141,141,0.06),rgba(255,255,255,0.015))] p-5";
  const displayResultMetricCardClassName = displayResultPassed
    ? "rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4"
    : "rounded-[1.35rem] border border-[rgba(255,141,141,0.12)] bg-[rgba(255,141,141,0.06)] p-4";
  const displayResultRewriteClassName = displayResultPassed
    ? "mt-3 rounded-[1.5rem] border border-white/8 bg-black/20 p-5 text-sm leading-7 text-white"
    : "mt-3 rounded-[1.5rem] border border-[rgba(255,141,141,0.14)] bg-[linear-gradient(180deg,rgba(255,141,141,0.06),rgba(0,0,0,0.18))] p-5 text-sm leading-7 text-white";
  const displayResultScoreBadgeClassName = displayResultPassed
    ? "rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
    : "rounded-full border border-[rgba(255,141,141,0.16)] bg-[rgba(255,141,141,0.08)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#ffd2d2]";
  const displayResultStatusBadgeClassName = displayResultPassed
    ? "accent-button bg-[var(--accent)]"
    : "border border-[rgba(255,141,141,0.22)] bg-[rgba(255,141,141,0.12)] text-[#ffe1e1]";
  const coachingMissedPoints = displayResult?.missed_points.slice(0, 3) ?? [];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(getAttemptStorageKey(moduleId));

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as SavedAttempt[];

      if (!Array.isArray(parsed)) {
        return;
      }

      setAttemptHistory((current) => mergeAttempts(parsed, current));
    } catch {
      // Ignore malformed local attempt caches and keep the server-provided history.
    }
  }, [moduleId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(getAttemptStorageKey(moduleId), JSON.stringify(attemptHistory));
  }, [attemptHistory, moduleId]);

  function goToQuestion(nextQuestionIndex: number) {
    const nextQuestion = questions[nextQuestionIndex];
    const nextAttempt = latestAttemptsByQuestion.get(nextQuestion.id) ?? null;

    setQuestionIndex(nextQuestionIndex);
    setAnswer(nextAttempt?.responseText ?? "");
    setResult(nextAttempt?.result ?? null);
    setSelectedAttemptKey(nextAttempt ? getAttemptKey(nextAttempt) : null);
    setError(null);
  }

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
      setAttemptHistory((current) => [
        {
          ...payload.attempt,
          result: payload.result
        },
        ...current
      ]);
      setSelectedAttemptKey(getAttemptKey(payload.attempt));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function openAttempt(attempt: SavedAttempt) {
    setAnswer(attempt.responseText ?? "");
    setResult(attempt.result ?? null);
    setSelectedAttemptKey(getAttemptKey(attempt));
    setError(null);
  }

  function goToNextQuestion() {
    if (!canAdvanceToNextQuestion) {
      return;
    }

    goToQuestion(questionIndex + 1);
  }

  function goToPreviousQuestion() {
    if (isFirstQuestion) {
      return;
    }

    goToQuestion(questionIndex - 1);
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
            {currentQuestionHistory.length ? (
              <span className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-xs text-[var(--muted)]">
                {currentQuestionHistory.length} attempt{currentQuestionHistory.length === 1 ? "" : "s"} saved
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
              {loading ? "Grading..." : displayResult && !displayResult.passed ? "Submit rewrite" : "Submit for grading"}
            </button>

            {canAdvanceToNextQuestion ? (
              <button
                type="button"
                onClick={goToNextQuestion}
                className="rounded-full border border-white/8 bg-white/[0.02] px-5 py-3.5 text-sm text-white transition hover:border-[var(--border-strong)]"
              >
                Next question
              </button>
            ) : null}
          </div>

          {nextQuestionLocked ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Earn {PASSING_SCORE}% or higher on this question to unlock the next one.
            </p>
          ) : null}

          {displayResult ? (
            <div className={`mt-10 rounded-[1.9rem] border p-6 sm:p-7 ${displayResultContainerClassName}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={displayResultScoreBadgeClassName}>
                  Score {Math.round(displayResult.score)}/100
                </span>
                <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${displayResultStatusBadgeClassName}`}>
                  {displayResult.passed ? "Passed" : "Needs work"}
                </span>
              </div>

              {!displayResult.passed ? (
                <div className="mt-6 rounded-[1.5rem] border border-[rgba(255,141,141,0.14)] bg-[rgba(255,141,141,0.06)] p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-[#ffd2d2]">What to fix before retrying</p>
                  <p className="mt-3 text-sm leading-7 text-white/90">
                    Tighten the coaching points below, then rewrite and resubmit. The next question unlocks at{" "}
                    {PASSING_SCORE}+.
                  </p>
                  {coachingMissedPoints.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {coachingMissedPoints.map((missedPoint) => (
                        <span
                          key={missedPoint}
                          className="rounded-full border border-[rgba(255,141,141,0.18)] bg-[rgba(255,141,141,0.08)] px-3 py-2 text-xs text-[#ffe1e1]"
                        >
                          {missedPoint}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-7">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Coaching scores</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    0-{RUBRIC_SCORE_MAX} each
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {RUBRIC_SCORE_KEYS.map((key) => (
                    <div key={key} className={displayResultMetricCardClassName}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        {RUBRIC_SCORE_LABELS[key]}
                      </p>
                      <p className="headline mt-3 text-3xl">
                        {formatRubricScore(displayResult.rubric_scores[key])}
                        <span className="ml-1 text-base text-[var(--muted)]">/5</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 grid gap-6 lg:grid-cols-2">
                <div className={displayResultPanelClassName}>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Strengths</p>
                  {displayResult.strengths.length ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-white">
                      {displayResult.strengths.map((strength) => (
                        <li key={strength}>- {strength}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      No clear strengths were captured on this attempt yet.
                    </p>
                  )}
                </div>
                <div className={displayResultPanelClassName}>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Missed points</p>
                  {displayResult.missed_points.length ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-white">
                      {displayResult.missed_points.map((missedPoint) => (
                        <li key={missedPoint}>- {missedPoint}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      No major missed points were flagged on this attempt.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Feedback</p>
                  <p className="mt-3 text-sm leading-7 text-white/95">{displayResult.feedback_to_agent}</p>
                </div>

                {canRevealTeachingMaterials ? (
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Ideal rewrite</p>
                    <p className={displayResultRewriteClassName}>{displayResult.ideal_rewrite}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Ideal rewrite</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      The ideal rewrite unlocks after you pass this question or after two failed attempts.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : selectedAttempt ? (
            <div className="mt-10 rounded-[1.9rem] border border-white/8 bg-white/[0.02] p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Score {Math.round(selectedAttempt.score)}/100
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                    selectedAttempt.passed
                      ? "border border-[rgba(151,255,111,0.2)] bg-[rgba(151,255,111,0.08)] text-[#d9ffcb]"
                      : "border border-[rgba(255,141,141,0.22)] bg-[rgba(255,141,141,0.12)] text-[#ffe1e1]"
                  }`}
                >
                  {selectedAttempt.passed ? "Passed" : "Needs work"}
                </span>
              </div>
              <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
                Detailed grading feedback is not available for this saved attempt.
              </p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="card card-stat rounded-[2rem] p-6">
            <p className="eyebrow">Questions</p>
            <div className="mt-5 space-y-3">
              {questions.map((item, index) => {
                const passed = passedQuestionIds.has(item.id);
                const active = index === questionIndex;
                const locked = index > firstUnpassedIndex;
                const ready = !active && !passed && !locked && index === firstUnpassedIndex;
                const stateLabel = active ? "Current" : passed ? "Passed" : ready ? "Ready" : locked ? "Locked" : "Open";

                return (
                  <div
                    key={item.id}
                    className={`rounded-[1.35rem] border px-4 py-4 text-sm ${
                      active
                        ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-white"
                        : passed
                          ? "border-[rgba(151,255,111,0.14)] bg-[rgba(151,255,111,0.04)] text-white"
                          : locked
                            ? "border-white/6 bg-transparent text-[var(--muted)]"
                            : "border-white/8 bg-white/[0.02] text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em]">Question {index + 1}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                          active
                            ? "bg-white/10 text-white"
                            : passed
                              ? "bg-[rgba(151,255,111,0.1)] text-[#d9ffcb]"
                              : locked
                                ? "bg-white/[0.03] text-[var(--muted)]"
                                : "bg-white/[0.05] text-white/85"
                        }`}
                      >
                        {stateLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-stat rounded-[2rem] p-6">
            <p className="eyebrow">Status</p>
            <p className="headline mt-4 text-3xl capitalize">{progress.status.replace("_", " ")}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {progress.completedQuestions} of {progress.totalQuestions} questions passed
            </p>
            <p className="mt-7 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Average Score</p>
            <p className="headline mt-3 text-3xl">
              {progress.averageScore === null ? "No score yet" : `${Math.round(progress.averageScore)}/100`}
            </p>
          </div>

          <div className="card card-stat rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Attempt History</p>
              {currentQuestionHistory.length ? (
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {currentQuestionHistory.length} total
                </span>
              ) : null}
            </div>
            {currentQuestionHistory.length ? (
              <div className="mt-5 space-y-3">
                {currentQuestionHistory.map((attempt, index) => (
                  <button
                    key={`${attempt.questionId}-${attempt.createdAt ?? index}-${attempt.score}`}
                    type="button"
                    onClick={() => openAttempt(attempt)}
                    className={`block w-full rounded-[1.2rem] border px-4 py-3 text-left transition ${
                      selectedAttemptKey === getAttemptKey(attempt)
                        ? "border-[var(--border-strong)] bg-[var(--accent-soft)]"
                        : "border-white/8 bg-white/[0.02] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Attempt {index + 1}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                        attempt.passed
                          ? "bg-[rgba(151,255,111,0.1)] text-[#d9ffcb]"
                          : "bg-[rgba(255,141,141,0.12)] text-[#ffd2d2]"
                      }`}>
                        {attempt.passed ? "Passed" : "Needs work"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="headline text-3xl">{Math.round(attempt.score)}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">out of 100</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
                No graded attempts yet for this question.
              </p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

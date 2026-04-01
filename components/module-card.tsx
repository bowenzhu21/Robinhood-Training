import Link from "next/link";

import type { DashboardModule, ModuleLibraryItem } from "@/lib/types";
import { formatPercent, formatScore } from "@/lib/utils";

type ModuleCardProps = {
  module: DashboardModule | ModuleLibraryItem;
  variant?: "dashboard" | "modules";
};

export function ModuleCard({ module, variant = "modules" }: ModuleCardProps) {
  if (variant === "modules") {
    const progressModule = module as DashboardModule;
    const completionRate = progressModule.totalQuestions
      ? (progressModule.completedQuestions / progressModule.totalQuestions) * 100
      : 0;
    const categoryLabel = progressModule.category ?? "training";
    const difficultyLabel = progressModule.difficulty ?? "standard";
    const statusLabel =
      progressModule.status === "completed"
        ? "Completed"
        : progressModule.status === "in_progress"
          ? "In progress"
          : "Not started";
    const ctaLabel =
      progressModule.status === "completed"
        ? "Review module"
        : progressModule.status === "in_progress"
          ? "Continue training"
          : "Start module";

    return (
      <article className="card rounded-[2rem] p-7 sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div className="space-y-3">
            <p className="eyebrow">{categoryLabel}</p>
            <div className="space-y-2">
              <h3 className="headline text-[2rem] leading-tight">{progressModule.title}</h3>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
                {progressModule.description || "No description yet."}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">
            {difficultyLabel}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="subtle-panel rounded-full px-4 py-2.5">
            <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Status</span>
            <span className="ml-3 text-sm text-white">{statusLabel}</span>
          </div>
          <div className="subtle-panel rounded-full px-4 py-2.5">
            <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Questions</span>
            <span className="ml-3 text-sm text-white">
              {progressModule.completedQuestions}/{progressModule.totalQuestions}
            </span>
          </div>
          <div className="subtle-panel rounded-full px-4 py-2.5">
            <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Average</span>
            <span className="ml-3 text-sm text-white">{formatScore(progressModule.averageScore)}</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Progress</p>
              <p className="text-sm text-white">{formatPercent(completionRate)}</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <Link
            href={`/training/${progressModule.id}`}
            className="accent-glow rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#061006] transition hover:brightness-105"
          >
            {ctaLabel}
          </Link>
        </div>
      </article>
    );
  }

  const dashboardModule = module as DashboardModule;
  const completionRate = dashboardModule.totalQuestions
    ? (dashboardModule.completedQuestions / dashboardModule.totalQuestions) * 100
    : 0;
  const ctaLabel =
    dashboardModule.status === "completed"
      ? "Review module"
      : dashboardModule.status === "in_progress"
        ? "Continue training"
        : "Start module";
  const categoryLabel = dashboardModule.category ?? "training";
  const difficultyLabel = dashboardModule.difficulty ?? "standard";
  const statusLabel =
    dashboardModule.status === "completed"
      ? "Completed"
      : dashboardModule.status === "in_progress"
        ? "In progress"
        : "Not started";

  return (
    <article className="card rounded-[2rem] p-7 sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div className="space-y-3">
          <p className="eyebrow">{categoryLabel}</p>
          <div className="space-y-2">
            <h3 className="headline text-[2rem] leading-tight">{module.title}</h3>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">{module.description}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">
          {difficultyLabel}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="subtle-panel rounded-full px-4 py-2.5">
          <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Status</span>
          <span className="ml-3 text-sm text-white">{statusLabel}</span>
        </div>
        <div className="subtle-panel rounded-full px-4 py-2.5">
          <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Questions</span>
          <span className="ml-3 text-sm text-white">
            {dashboardModule.completedQuestions}/{dashboardModule.totalQuestions}
          </span>
        </div>
        <div className="subtle-panel rounded-full px-4 py-2.5">
          <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Average</span>
          <span className="ml-3 text-sm text-white">{formatScore(dashboardModule.averageScore)}</span>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">Progress</p>
            <p className="text-sm text-white">{formatPercent(completionRate)}</p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
        <Link
          href={`/training/${module.id}`}
          className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm text-white transition hover:border-[var(--border-strong)]"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

import Link from "next/link";

import type { DashboardModule } from "@/lib/types";
import { formatPercent, formatScore } from "@/lib/utils";

type ModuleCardProps = {
  module: DashboardModule;
  variant?: "dashboard" | "modules";
};

export function ModuleCard({ module, variant = "modules" }: ModuleCardProps) {
  const completionRate = module.totalQuestions
    ? (module.completedQuestions / module.totalQuestions) * 100
    : 0;

  const ctaLabel =
    module.status === "completed" ? "Review module" : module.status === "in_progress" ? "Continue training" : "Start module";

  return (
    <article className="card rounded-[2rem] p-7 sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div className="space-y-3">
          <p className="eyebrow">{module.category}</p>
          <div className="space-y-2">
            <h3 className="headline text-[2rem] leading-tight">{module.title}</h3>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">{module.description}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">
          {module.difficulty ?? "standard"}
        </span>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="subtle-panel rounded-[1.4rem] p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">Progress</p>
          <p className="mt-3 text-xl text-white">{formatPercent(completionRate)}</p>
        </div>
        <div className="subtle-panel rounded-[1.4rem] p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">Average Score</p>
          <p className="mt-3 text-xl text-white">{formatScore(module.averageScore)}</p>
        </div>
        <div className="subtle-panel rounded-[1.4rem] p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">Questions</p>
          <p className="mt-3 text-xl text-white">
            {module.completedQuestions}/{module.totalQuestions}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-strong),var(--accent))]"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <Link
          href={`/training/${module.id}`}
          className={
            variant === "dashboard"
              ? "accent-glow rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-black"
              : "rounded-full border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm text-white transition hover:border-[var(--border-strong)]"
          }
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

import Link from "next/link";

import { DashboardProgressRing } from "@/components/dashboard-progress-ring";
import { ModuleCard } from "@/components/module-card";
import { TopNav } from "@/components/top-nav";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/data";

export default async function DashboardPage() {
  const user = await requireUser();
  await ensureProfile(user);

  const summary = await getDashboardSummary(user.id);
  const firstAvailableModule = summary.modules[0];
  const firstIncompleteModule = summary.modules.find((module) => module.completedQuestions < module.totalQuestions);
  const resumeModule = firstIncompleteModule ?? firstAvailableModule;
  const firstName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.split(" ")[0]
      : user.email?.split("@")[0] ?? "Agent";
  const averageScoreLabel =
    summary.averageScore === null || Number.isNaN(summary.averageScore) ? "0" : `${Math.round(summary.averageScore)}`;
  const remainingInCurrentModule = resumeModule
    ? Math.max(resumeModule.totalQuestions - resumeModule.completedQuestions, 0)
    : 0;
  const questionsCaption = resumeModule
    ? remainingInCurrentModule === 0
      ? "current module is complete"
      : `${remainingInCurrentModule} remaining in current module`
    : "no module selected yet";
  const gradedResponses = summary.completedQuestions;
  const averageCaption = `based on ${gradedResponses} graded response${gradedResponses === 1 ? "" : "s"}`;

  return (
    <div>
      <TopNav currentPath="/dashboard" />

      <main className="page-shell py-12">
        <section className="grid gap-6 xl:grid-cols-12 xl:items-stretch">
          <div className="card card-welcome card-pos-left rounded-[2.25rem] p-7 sm:p-8 xl:col-span-5 xl:h-full">
            <p className="eyebrow">Welcome back</p>
            <h1 className="headline mt-18 text-5xl sm:text-6xl">{firstName}</h1>
            <p className="mt-4 max-w-lg text-[0.98rem] leading-8 text-[var(--muted)]">
              Continue your customer support training modules.
            </p>

            {resumeModule ? (
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href={`/training/${resumeModule.id}`}
                  className="accent-button accent-glow rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold transition hover:brightness-105"
                >
                  Continue training
                </Link>
                <Link
                  href="/modules"
                  className="rounded-full border border-white/8 bg-white/[0.02] px-5 py-3.5 text-sm text-white transition hover:border-[var(--border-strong)]"
                >
                  View modules
                </Link>
              </div>
              ) : null}
          </div>

          <div className="xl:col-span-4">
            <DashboardProgressRing completionRate={summary.completionRate} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1 xl:grid-rows-2 xl:h-full">
            <div className="card card-stat card-pos-right flex min-h-[10.75rem] flex-col rounded-[1.7rem] p-6 xl:h-full">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--muted)]">
                Questions Done
              </p>
              <div className="flex flex-1 flex-col items-center justify-center pt-6 text-center">
                <p className="headline text-[3rem] leading-none text-white">
                  {summary.completedQuestions}/{summary.totalQuestions}
                </p>
                <p className="mt-4 max-w-[14rem] text-sm leading-6 text-[var(--muted)]">{questionsCaption}</p>
              </div>
            </div>

            <div className="card card-stat card-pos-right flex min-h-[10.75rem] flex-col rounded-[1.7rem] p-6 xl:h-full">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--muted)]">
                Average Score
              </p>
              <div className="flex flex-1 flex-col items-center justify-center pt-6 text-center">
                <p className="headline text-[3rem] leading-none text-white">{averageScoreLabel}</p>
                <p className="mt-4 max-w-[14rem] text-sm leading-6 text-[var(--muted)]">{averageCaption}</p>
              </div>
            </div>
          </div>
        </section>

        {resumeModule ? (
          <section className="mt-12 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Up Next</p>
                <h2 className="headline mt-3 text-3xl sm:text-4xl">Resume your next module</h2>
              </div>
              <Link href="/modules" className="text-sm text-[var(--muted)] transition hover:text-white">
                View all modules
              </Link>
            </div>

            <ModuleCard module={resumeModule} variant="dashboard" />
          </section>
        ) : null}
      </main>
    </div>
  );
}

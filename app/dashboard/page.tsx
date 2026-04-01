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

  return (
    <div>
      <TopNav currentPath="/dashboard" />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px]">
          <div className="card rounded-[2.25rem] p-8 sm:p-10">
            <p className="eyebrow">Welcome back</p>
            <h1 className="headline mt-6 text-5xl sm:text-6xl">{firstName}</h1>
            <p className="mt-6 max-w-2xl text-[1.02rem] leading-8 text-[var(--muted)]">
              Continue your customer service onboarding. Each question is graded immediately so agents can tighten
              empathy, clarity, and next-step execution as they go.
            </p>

            {resumeModule ? (
              <div className="mt-12 flex flex-wrap items-center gap-4">
                <Link
                  href={`/training/${resumeModule.id}`}
                  className="accent-glow rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold text-[#061006] transition hover:brightness-105"
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

          <DashboardProgressRing
            completionRate={summary.completionRate}
            completedQuestions={summary.completedQuestions}
            totalQuestions={summary.totalQuestions}
            averageScore={summary.averageScore}
          />
        </section>

        {resumeModule ? (
          <section className="mt-14 space-y-6">
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

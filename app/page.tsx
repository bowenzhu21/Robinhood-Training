import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  const primaryHref = user ? "/dashboard" : "/login";
  const primaryLabel = user ? "Open dashboard" : "Sign in";

  return (
    <main className="page-shell flex min-h-screen items-center py-20">
      <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.15fr)_380px] lg:items-center">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_14px_rgba(151,255,111,0.9)]" />
            Beta Version
          </div>
          <div className="space-y-5">
            <p className="eyebrow">Robinhood Training</p>
            <h1 className="headline max-w-4xl text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
              Customer Service Training for Written Evaluations
            </h1>
            <p className="max-w-2xl text-[1.02rem] leading-8 text-[var(--muted)]">
              This beta version is intended for written evaluations. Use it to complete response-writing assessments,
              review AI-generated scoring, and track progress during the pilot.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={primaryHref}
              className="accent-glow accent-button inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em]"
            >
              {primaryLabel}
            </Link>
            <Link
              href="/modules"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.02] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)] transition hover:border-[var(--border-strong)] hover:text-white"
            >
              View modules
            </Link>
          </div>
        </section>

        <aside className="card card-soft rounded-[2rem] p-8">
          <p className="eyebrow">Release notes</p>
          <div className="mt-6 space-y-6">
            <div className="subtle-panel rounded-[1.5rem] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                Status
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Beta release for internal use while the written evaluation flow is being tested and refined.
              </p>
            </div>
            <div className="subtle-panel rounded-[1.5rem] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                Scope
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Focused on written evaluations only, with one-question submissions, AI grading, and progress tracking.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

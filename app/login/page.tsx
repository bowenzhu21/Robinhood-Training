import { AuthForm } from "@/components/auth-form";
import { redirectIfAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <main className="page-shell flex min-h-screen items-center py-20">
      <div className="grid w-full gap-16 lg:grid-cols-[minmax(0,1.15fr)_430px] lg:items-center">
        <section className="space-y-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_14px_rgba(151,255,111,0.9)]" />
            Internal Training Tool
          </div>
          <div className="space-y-6">
            <h1 className="headline max-w-4xl text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
              Customer Support Agent Training Tool
            </h1>
            <p className="max-w-2xl text-[1.02rem] leading-8 text-[var(--muted)]">
              A focused onboarding workspace for response writing, AI grading, and module progress tracking. Built for
              simple, repeatable coaching.
            </p>
          </div>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="subtle-panel rounded-[1.5rem] p-5">
              <p className="eyebrow">Coaching</p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">One question at a time, with immediate feedback and ideal rewrites.</p>
            </div>
            <div className="subtle-panel rounded-[1.5rem] p-5">
              <p className="eyebrow">Progress</p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">Track module completion and average score without extra noise.</p>
            </div>
          </div>
        </section>

        <AuthForm />
      </div>
    </main>
  );
}

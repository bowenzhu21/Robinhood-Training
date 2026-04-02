import { ModuleCard } from "@/components/module-card";
import { TopNav } from "@/components/top-nav";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getDashboardModules } from "@/lib/data";

const moduleToneClasses = ["card-module-lime", "card-module-mint", "card-module-gold", "card-module-emerald"];

export default async function ModulesPage() {
  const user = await requireUser();
  await ensureProfile(user);

  const modules = await getDashboardModules(user.id);

  return (
    <div>
      <TopNav currentPath="/modules" />

      <main className="page-shell py-12">
        <section className="relative mb-12 overflow-hidden rounded-[2.4rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(8,12,9,0.96),rgba(6,9,7,0.92))] px-7 py-8 shadow-[0_22px_80px_rgba(0,0,0,0.28)] sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(151,255,111,0.2),transparent_68%)] blur-3xl" />
          <div className="pointer-events-none absolute left-12 top-0 h-px w-44 bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-70" />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] px-4 py-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-strong)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_16px_rgba(151,255,111,0.95)]" />
              Modules
            </div>
            <h1 className="headline max-w-4xl text-5xl sm:text-6xl">Customer service training library</h1>
            <p className="max-w-3xl text-[1.02rem] leading-8 text-[var(--muted)]">
              Focused modules built for practical customer responses. Keep the experience simple: one module, one question,
              one clear coaching loop at a time.
            </p>
          </div>
        </section>

        {modules.length ? (
          <section className="grid gap-7">
            {modules.map((module, index) => (
              <ModuleCard
                key={module.id}
                module={module}
                variant="modules"
                toneClassName={moduleToneClasses[index % moduleToneClasses.length]}
              />
            ))}
          </section>
        ) : (
          <section className="card card-soft rounded-[2rem] p-8 sm:p-10">
            <p className="eyebrow">No modules yet</p>
            <h2 className="headline mt-4 text-3xl sm:text-4xl">No training modules have been seeded yet.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted)]">
              Add training content to <code>training-questions.json</code> and run <code>npm run seed</code> to create
              your first modules and questions in Supabase.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

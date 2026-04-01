import { ModuleCard } from "@/components/module-card";
import { TopNav } from "@/components/top-nav";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getDashboardModules } from "@/lib/data";

export default async function ModulesPage() {
  const user = await requireUser();
  await ensureProfile(user);

  const modules = await getDashboardModules(user.id);

  return (
    <div>
      <TopNav currentPath="/modules" />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="mb-12 space-y-5">
          <p className="eyebrow">Modules</p>
          <h1 className="headline text-5xl sm:text-6xl">Customer service training library</h1>
          <p className="max-w-3xl text-[1.02rem] leading-8 text-[var(--muted)]">
            Focused modules built for practical customer responses. Keep the experience simple: one module, one question,
            one clear coaching loop at a time.
          </p>
        </section>

        {modules.length ? (
          <section className="grid gap-7">
            {modules.map((module) => (
              <ModuleCard key={module.id} module={module} variant="modules" />
            ))}
          </section>
        ) : (
          <section className="card rounded-[2rem] p-8 sm:p-10">
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

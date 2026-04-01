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

        <section className="grid gap-7">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </section>
      </main>
    </div>
  );
}

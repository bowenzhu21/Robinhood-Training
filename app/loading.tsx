export default function LoadingPage() {
  return (
    <main className="page-shell flex min-h-screen items-center py-16">
      <div className="card card-soft w-full rounded-[2rem] p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Loading</p>
        <h1 className="headline mt-4 text-4xl">Preparing your training workspace...</h1>
      </div>
    </main>
  );
}

export default function LoadingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <div className="card w-full rounded-[2rem] p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Loading</p>
        <h1 className="headline mt-4 text-4xl">Preparing your training workspace...</h1>
      </div>
    </main>
  );
}

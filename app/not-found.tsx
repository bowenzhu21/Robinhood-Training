import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="card w-full rounded-[2rem] p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Not found</p>
        <h1 className="headline mt-4 text-5xl">This training page does not exist.</h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-[var(--muted)]">
          The module may not be seeded yet, or the URL is invalid.
        </p>
        <Link
          href="/modules"
          className="mt-8 inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-5 py-3 text-sm font-medium text-black"
        >
          Back to modules
        </Link>
      </div>
    </main>
  );
}

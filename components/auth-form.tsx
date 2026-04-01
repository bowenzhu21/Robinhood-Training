"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/browser";

type Mode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    if (mode === "login") {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setMessage("Account created. If email confirmation is enabled, confirm your inbox before signing in.");
    setMode("login");
    setLoading(false);
  }

  return (
    <div className="card w-full max-w-md rounded-[2.2rem] p-8 sm:p-9">
      <div className="mb-8 flex rounded-full border border-white/8 bg-white/[0.02] p-1">
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`flex-1 rounded-full px-4 py-2 text-sm capitalize transition ${
              mode === value ? "bg-[var(--accent)] text-[#061006]" : "text-[var(--muted)]"
            }`}
          >
            {value === "signup" ? "Create account" : "Log in"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" ? (
          <label className="block space-y-2">
            <span className="text-sm text-[var(--muted)]">Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-[1.25rem] border border-white/8 bg-white/[0.02] px-4 py-3.5 outline-none transition placeholder:text-white/20 focus:border-[var(--border-strong)]"
              placeholder="Taylor Morgan"
              required
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm text-[var(--muted)]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-[1.25rem] border border-white/8 bg-white/[0.02] px-4 py-3.5 outline-none transition placeholder:text-white/20 focus:border-[var(--border-strong)]"
            placeholder="agent@company.com"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-[var(--muted)]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-[1.25rem] border border-white/8 bg-white/[0.02] px-4 py-3.5 outline-none transition placeholder:text-white/20 focus:border-[var(--border-strong)]"
            placeholder="Minimum 6 characters"
            minLength={6}
            required
          />
        </label>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="accent-glow mt-2 w-full rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-5 py-3.5 text-sm font-medium text-[#061006] disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

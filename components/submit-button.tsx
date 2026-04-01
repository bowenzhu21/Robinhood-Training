"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function SubmitButton({ children, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}

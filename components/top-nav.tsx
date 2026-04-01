import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

type TopNavProps = {
  currentPath: string;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/modules", label: "Modules" }
];

export function TopNav({ currentPath }: TopNavProps) {
  return (
    <header className="border-b border-white/6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_18px_rgba(151,255,111,0.9)]" />
          <div className="leading-none">
            <span className="headline block text-[1.35rem]">Robinhood Training</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 rounded-full border border-white/7 bg-white/[0.02] px-1.5 py-1.5">
            {navItems.map((item) => {
              const active = currentPath.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition",
                    active
                      ? "border border-[var(--border-strong)] bg-[var(--accent-soft)] text-white"
                      : "border border-transparent text-[var(--muted)] hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

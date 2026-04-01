import { formatPercent, formatScore } from "@/lib/utils";

type DashboardProgressRingProps = {
  completionRate: number;
  completedQuestions: number;
  totalQuestions: number;
  averageScore: number | null;
};

export function DashboardProgressRing({
  completionRate,
  completedQuestions,
  totalQuestions,
  averageScore
}: DashboardProgressRingProps) {
  const clampedProgress = Math.max(0, Math.min(100, Number.isFinite(completionRate) ? completionRate : 0));
  const scoreLabel = averageScore === null || Number.isNaN(averageScore) ? "0" : `${Math.round(averageScore)}`;
  const size = 266;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="card overflow-hidden rounded-[2.25rem] p-7 sm:p-8">
      <p className="eyebrow">Completion Progress</p>

      <div className="mt-7 flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(95,191,67,0.18),transparent_64%)] blur-3xl" />
          <svg width={size} height={size} className="-rotate-90 overflow-visible">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent-strong)" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="headline text-6xl">{formatPercent(clampedProgress)}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Complete</p>
          </div>
        </div>

        <div className="relative z-10 -mt-12 grid w-full max-w-[460px] grid-cols-2 items-stretch gap-3 px-2">
          <div className="flex min-h-[152px] flex-col rounded-[1.6rem] border border-white/6 bg-white/[0.005] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <p className="whitespace-nowrap text-[0.68rem] uppercase tracking-[0.18em] text-[var(--muted)]">Questions Done</p>
            <div className="flex flex-1 items-center justify-center">
              <p className="text-center text-[2.35rem] leading-none text-white">
              {completedQuestions}/{totalQuestions}
              </p>
            </div>
          </div>
          <div className="flex min-h-[152px] flex-col rounded-[1.6rem] border border-white/6 bg-white/[0.005] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted)]">Average Score</p>
            <div className="flex flex-1 items-center justify-center">
              <p className="text-center text-[2.35rem] leading-none text-white">{scoreLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

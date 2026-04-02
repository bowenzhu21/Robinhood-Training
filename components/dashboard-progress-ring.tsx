import { formatPercent } from "@/lib/utils";

type DashboardProgressRingProps = {
  completionRate: number;
};

export function DashboardProgressRing({ completionRate }: DashboardProgressRingProps) {
  const clampedProgress = Math.max(0, Math.min(100, Number.isFinite(completionRate) ? completionRate : 0));
  const size = 236;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const guideRadius = radius + 12;
  const innerRadius = radius - 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedProgress / 100) * circumference;
  const progressAngle = (clampedProgress / 100) * 360;
  const progressRadians = (progressAngle * Math.PI) / 180;
  const progressDotX = size / 2 + radius * Math.cos(progressRadians);
  const progressDotY = size / 2 + radius * Math.sin(progressRadians);

  return (
    <div className="card card-progress card-pos-center flex h-full min-h-[21.5rem] flex-col overflow-hidden rounded-[2.25rem] p-6 sm:p-7">
      <p className="eyebrow">Completion Progress</p>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-[276px] w-[276px] rounded-full bg-[radial-gradient(circle,rgba(95,191,67,0.18),transparent_64%)] blur-3xl" />
          <svg width={size} height={size} className="-rotate-90 overflow-visible">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={guideRadius}
              fill="none"
              stroke="rgba(151,255,111,0.08)"
              strokeDasharray="2 11"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
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
              r={innerRadius}
              fill="none"
              stroke="rgba(151,255,111,0.05)"
              strokeWidth="1"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              filter="url(#progressGlow)"
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            {clampedProgress > 0 ? (
              <g filter="url(#progressDotGlow)">
                <circle cx={progressDotX} cy={progressDotY} r="4.5" fill="var(--accent)" />
                <circle cx={progressDotX} cy={progressDotY} r="9" fill="rgba(151,255,111,0.16)" />
              </g>
            ) : null}
            <defs>
              <linearGradient id="progressGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-strong)" />
                <stop offset="55%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="#b4ff93" />
              </linearGradient>
              <filter id="progressGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(151,255,111,0.45)" />
              </filter>
              <filter id="progressDotGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(151,255,111,0.35)" />
              </filter>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="absolute h-[146px] w-[146px] rounded-full border border-white/[0.03] bg-[radial-gradient(circle,rgba(151,255,111,0.055),rgba(7,10,8,0.14)_58%,transparent_78%)]" />
            <p className="headline text-5xl sm:text-[4.5rem]">{formatPercent(clampedProgress)}</p>
            <p className="mt-2 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--muted)]">Complete</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

interface OnboardingCardProps {
  fullName: string | null;
  phone: string | null;
  address: string | null;
  dmcaReplyEmail: string | null;
}

interface CheckItem {
  label: string;
  done: boolean;
}

export function OnboardingCard({ fullName, phone, address, dmcaReplyEmail }: OnboardingCardProps) {
  const checks: CheckItem[] = [
    { label: 'Full name set', done: !!fullName },
    { label: 'Physical address added', done: !!address },
    { label: 'Phone number added', done: !!phone },
    { label: 'Takedown reply email set', done: !!dmcaReplyEmail },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const totalCount = checks.length;
  const allDone = completedCount === totalCount;

  // Don't show if everything is complete
  if (allDone) return null;

  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="mb-6 sm:mb-8 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-accent/30">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-pg-text mb-1">Finish Your Profile</h2>
          <p className="text-xs sm:text-sm text-pg-text-muted">
            Add your contact info so we can generate legally valid takedown notices on your behalf.
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-pg-accent text-white hover:bg-pg-accent/90 transition-colors text-center"
        >
          Complete Setup
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-pg-text-muted mb-1">
          <span>{completedCount} of {totalCount} complete</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-pg-bg overflow-hidden">
          <div
            className="h-full rounded-full bg-pg-accent transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-xs sm:text-sm">
            {check.done ? (
              <svg className="w-4 h-4 text-pg-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-pg-border shrink-0" />
            )}
            <span className={check.done ? 'text-pg-text-muted line-through' : 'text-pg-text'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';

const ACTIONS = [
  {
    label: 'Add Product',
    href: '/dashboard/products',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    label: 'Run Scan',
    href: '/dashboard/products',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    label: 'Review Threats',
    href: '/dashboard/infringements',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Takedowns',
    href: '/dashboard/takedowns',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function QuickActionsBar() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ACTIONS.map((action) => (
        <Link key={action.label} href={action.href}>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-pg-surface border border-pg-border hover:border-pg-accent/50 hover:bg-pg-surface-light transition-all cursor-pointer group">
            <div className="text-pg-text-muted group-hover:text-pg-accent transition-colors">
              {action.icon}
            </div>
            <span className="text-xs font-medium text-pg-text-muted group-hover:text-pg-text transition-colors">
              {action.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

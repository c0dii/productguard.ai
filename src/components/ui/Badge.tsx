import { HTMLAttributes } from 'react';
import type { RiskLevel, PlanTier } from '@/types';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: RiskLevel | PlanTier | 'default';
}

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const variants = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
    scout: 'badge-plan-scout',
    starter: 'badge-plan-starter',
    pro: 'badge-plan-pro',
    business: 'badge-plan-business',
    default: 'inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-pg-surface-light text-pg-text-muted border border-pg-border',
  };

  return (
    <span className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

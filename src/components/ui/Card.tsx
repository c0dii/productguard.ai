import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ children, glow = false, className = '', ...props }: CardProps) {
  const baseStyles = 'rounded-xl p-4 sm:p-6';
  const glowStyles = glow
    ? 'bg-pg-surface border border-pg-accent shadow-[0_0_30px_rgba(0,212,170,0.12)]'
    : 'bg-pg-surface border border-pg-border shadow-[0_2px_8px_rgba(0,0,0,0.3)]';

  return (
    <div className={`${baseStyles} ${glowStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-pg-accent text-pg-bg hover:scale-105 shadow-[0_0_20px_rgba(0,212,170,0.3)] hover:shadow-[0_0_30px_rgba(0,212,170,0.5)]',
      secondary: 'bg-transparent text-pg-accent border border-pg-accent hover:bg-pg-accent hover:bg-opacity-10',
      danger: 'bg-pg-danger text-white hover:scale-105 shadow-[0_0_20px_rgba(255,71,87,0.3)]',
      ghost: 'bg-transparent text-pg-text-muted hover:text-pg-text hover:bg-pg-surface-light',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base',
      lg: 'px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

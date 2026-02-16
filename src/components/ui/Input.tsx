import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-pg-text-muted mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`input-field ${error ? 'border-pg-danger' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-pg-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

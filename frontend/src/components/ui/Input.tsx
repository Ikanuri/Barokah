import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            `w-full px-4 py-3 
            bg-[var(--fill-secondary)] 
            border border-transparent
            rounded-ios-sm 
            text-[var(--text-primary)]
            placeholder:text-[var(--text-tertiary)]
            transition-all duration-200
            focus:outline-none focus:bg-[var(--glass-bg)] 
            focus:border-[var(--ios-blue)] 
            focus:ring-4 focus:ring-[var(--ios-blue)]/15
            backdrop-blur-sm`,
            error && 'border-[var(--ios-red)] focus:border-[var(--ios-red)] focus:ring-[var(--ios-red)]/15',
            className
          )}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-[var(--ios-red)]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

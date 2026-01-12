import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-semibold
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 
    dark:focus:ring-offset-gray-900 
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;
  
  const variants = {
    primary: `
      bg-[var(--ios-blue)] text-white rounded-ios-sm
      hover:brightness-110 
      focus:ring-[var(--ios-blue)]
      shadow-md hover:shadow-lg
    `,
    secondary: `
      bg-[var(--fill-secondary)] text-[var(--text-primary)] rounded-ios-sm
      hover:bg-[var(--fill-primary)]
      focus:ring-gray-400
      backdrop-blur-sm
    `,
    outline: `
      border-2 border-[var(--ios-blue)] text-[var(--ios-blue)] rounded-ios-sm
      hover:bg-[var(--ios-blue)] hover:text-white
      focus:ring-[var(--ios-blue)]
      bg-transparent
    `,
    ghost: `
      text-[var(--ios-blue)] rounded-ios-sm
      hover:bg-[var(--fill-secondary)]
      focus:ring-[var(--ios-blue)]
      bg-transparent
    `,
    danger: `
      bg-[var(--ios-red)] text-white rounded-ios-sm
      hover:brightness-110
      focus:ring-[var(--ios-red)]
      shadow-md hover:shadow-lg
    `,
    glass: `
      glass-button text-[var(--text-primary)]
      hover:shadow-lg
      focus:ring-[var(--ios-blue)]
    `,
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5 rounded-lg',
    md: 'text-base px-4 py-2.5 rounded-xl',
    lg: 'text-lg px-6 py-3 rounded-xl',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

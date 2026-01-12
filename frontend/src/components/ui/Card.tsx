import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick, hoverable, glass = true }) => {
  return (
    <div
      className={cn(
        glass ? 'glass-card' : 'bg-white dark:bg-gray-800 rounded-ios shadow-ios border border-gray-200/50 dark:border-gray-700/50',
        hoverable && 'hover:shadow-ios-lg cursor-pointer',
        'transition-all duration-300',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn(
      'px-5 md:px-6 py-4 border-b border-[var(--separator)]',
      className
    )}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={cn('px-5 md:px-6 py-4', className)}>{children}</div>;
};

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn(
      'px-5 md:px-6 py-4 border-t border-[var(--separator)] bg-[var(--fill-secondary)] rounded-b-ios',
      className
    )}>
      {children}
    </div>
  );
};

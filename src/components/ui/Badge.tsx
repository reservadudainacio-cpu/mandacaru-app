import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

export function Badge({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '',
  pulse = false 
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-full';
  
  const variantClasses = {
    success: 'bg-green-100 text-green-700 border border-green-200',
    danger: 'bg-red-100 text-red-700 border border-red-200',
    warning: 'bg-amber-100 text-amber-700 border border-amber-200',
    info: 'bg-blue-100 text-blue-700 border border-blue-200',
    primary: 'bg-orange-100 text-orange-700 border border-orange-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const pulseClasses = pulse ? 'animate-pulse' : '';

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${pulseClasses} ${className}`}>
      {children}
    </span>
  );
}

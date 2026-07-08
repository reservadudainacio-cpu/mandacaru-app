import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export function Card({ children, className = '', hover = false, gradient = false }: CardProps) {
  const baseClasses = 'rounded-2xl shadow-soft border transition-all duration-300';
  const hoverClasses = hover ? 'hover:shadow-soft-lg hover:scale-[1.02] hover:-translate-y-1' : '';
  const backgroundClasses = gradient 
    ? 'bg-gradient-to-br from-white to-orange-50/30 border-orange-100' 
    : 'bg-white border-gray-100';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${backgroundClasses} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-6 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`p-6 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

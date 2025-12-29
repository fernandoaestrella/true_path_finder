import React from 'react';

interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  as?: 'div' | 'article' | 'section';
}

export function InfoCard({
  children,
  className = '',
  elevated = false,
  as: Component = 'div',
}: BaseCardProps) {
  const classes = [
    'card',
    elevated && 'card-elevated',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <Component className={classes}>
      {children}
    </Component>
  );
}

interface ActionCardProps extends BaseCardProps {
  onClick: () => void;
}

export function ActionCard({
  children,
  className = '',
  elevated = false,
  onClick,
  as: Component = 'div',
}: ActionCardProps) {
  const classes = [
    'card',
    'card-interactive',
    elevated && 'card-elevated',
    'cursor-pointer',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <Component className={classes} onClick={onClick}>
      {children}
    </Component>
  );
}

interface CardProps extends BaseCardProps {
  onClick?: () => void;
}

export function Card({ onClick, ...props }: CardProps) {
  if (onClick) {
    return <ActionCard onClick={onClick} {...props} />;
  }
  return <InfoCard {...props} />;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export function CardTitle({ children, className = '', as: Component = 'h3' }: CardTitleProps) {
  return (
    <Component className={`font-semibold ${className}`}>
      {children}
    </Component>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 ${className}`}>
      {children}
    </div>
  );
}

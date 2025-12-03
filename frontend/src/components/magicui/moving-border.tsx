/**
 * MovingBorder Component
 *
 * Aceternity UI-inspired animated border effect.
 * Creates an animated gradient border that moves around the element.
 */

import { cn } from '@/lib/utils';

interface MovingBorderProps {
  children?: React.ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  as?: React.ElementType;
}

export function MovingBorder({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderClassName,
  as: Component = 'div',
}: MovingBorderProps) {
  return (
    <Component className={cn('relative overflow-hidden rounded-lg p-[1px]', containerClassName)}>
      <div
        className={cn(
          'absolute inset-0 z-0 rounded-lg',
          'bg-gradient-to-r from-primary/50 via-primary to-primary/50',
          'animate-moving-border',
          borderClassName
        )}
        style={{
          animationDuration: `${duration}ms`,
          backgroundSize: '200% 200%',
        }}
      />
      <div className={cn('relative z-10 rounded-lg bg-background', className)}>{children}</div>
    </Component>
  );
}

/**
 * Button with MovingBorder
 * Pre-configured button component with moving border effect
 */
interface ButtonProps extends MovingBorderProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function MovingBorderButton({ children, duration = 2000, className, containerClassName, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-lg p-[1px]',
        'transition-transform hover:scale-[1.02]',
        containerClassName
      )}
    >
      <div
        className={cn(
          'absolute inset-0 z-0 rounded-lg opacity-0 group-hover:opacity-100',
          'bg-gradient-to-r from-primary/50 via-primary to-primary/50',
          'animate-moving-border transition-opacity duration-300'
        )}
        style={{
          animationDuration: `${duration}ms`,
          backgroundSize: '200% 200%',
        }}
      />
      <div className={cn('relative z-10 rounded-lg bg-background px-4 py-2', className)}>{children}</div>
    </button>
  );
}

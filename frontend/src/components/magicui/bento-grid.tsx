/**
 * Bento Grid Component
 *
 * Aceternity UI-inspired grid layout with varied sizes and hover effects.
 * Creates a modern, visually striking layout for dashboard items.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main grid container
 * Uses CSS Grid with auto-fill and varied item sizes
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        'auto-rows-[minmax(240px,auto)]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  className?: string;
  title?: string | ReactNode;
  description?: string | ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
}

/**
 * Individual grid item with hover effects
 */
export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  children,
  actions,
  onClick,
}: BentoGridItemProps) {
  return (
    <motion.div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card',
        'hover:shadow-xl transition-all duration-300',
        'cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header Image/Content */}
      {header && <div className="relative w-full h-32 overflow-hidden rounded-t-xl bg-muted">{header}</div>}

      {/* Content */}
      <div className="p-6">
        {/* Icon */}
        {icon && <div className="mb-4 text-primary">{icon}</div>}

        {/* Title & Actions */}
        <div className="flex items-start justify-between mb-2">
          {/* Title */}
          {title && (
            <div className="font-semibold text-lg group-hover:text-primary transition-colors flex-1">{title}</div>
          )}

          {/* Actions Menu */}
          {actions && (
            <div className="flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>

        {/* Description */}
        {description && <div className="text-sm text-muted-foreground line-clamp-3">{description}</div>}

        {/* Custom Children */}
        {children}
      </div>

      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
}

/**
 * Skeleton loader for Bento Grid items
 */
export function BentoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <BentoGrid>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={cn('rounded-xl border bg-card overflow-hidden', 'animate-pulse')}>
          <div className="h-32 bg-muted" />
          <div className="p-6 space-y-3">
            <div className="h-6 w-3/4 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-2/3 bg-muted rounded" />
          </div>
        </div>
      ))}
    </BentoGrid>
  );
}

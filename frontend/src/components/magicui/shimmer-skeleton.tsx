/**
 * Shimmer Skeleton Component
 *
 * Enhanced loading skeleton with shimmer effect for premium feel.
 */

import { cn } from '@/lib/utils';
import { Shimmer } from './shimmer';

interface ShimmerSkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'circle';
  count?: number;
}

/**
 * Shimmer-enhanced skeleton loader
 * More engaging than standard pulse animation
 */
export function ShimmerSkeleton({ className, variant = 'default', count = 1 }: ShimmerSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const variantClasses = {
    default: 'h-4 w-full rounded',
    card: 'h-48 w-full rounded-lg',
    text: 'h-4 w-3/4 rounded',
    circle: 'h-12 w-12 rounded-full',
  };

  return (
    <>
      {skeletons.map((i) => (
        <div
          key={i}
          className={cn('relative overflow-hidden bg-muted animate-pulse', variantClasses[variant], className)}
        >
          <Shimmer className="opacity-50" duration={1.5} />
        </div>
      ))}
    </>
  );
}

/**
 * Card skeleton with shimmer
 */
export function ShimmerCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="relative h-32 bg-muted">
        <Shimmer className="opacity-50" duration={1.5} />
      </div>
      <div className="p-6 space-y-3">
        <ShimmerSkeleton variant="text" className="h-6 w-3/4" />
        <ShimmerSkeleton variant="text" className="h-4 w-full" />
        <ShimmerSkeleton variant="text" className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * List item skeleton with shimmer
 */
export function ShimmerListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="relative overflow-hidden rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <ShimmerSkeleton variant="circle" className="flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton variant="text" className="h-5 w-1/2" />
              <ShimmerSkeleton variant="text" className="h-4 w-3/4" />
            </div>
          </div>
          <Shimmer className="opacity-30" duration={2} />
        </div>
      ))}
    </div>
  );
}

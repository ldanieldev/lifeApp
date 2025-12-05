/**
 * Shimmer Effect Component (MagicUI-inspired)
 *
 * Creates an animated shimmer overlay effect for cards on hover.
 */

import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  duration?: number;
}

export function Shimmer({ className, duration = 2 }: ShimmerProps) {
  return (
    <div className={cn('absolute inset-0 -z-10 overflow-hidden rounded-lg', className)}>
      <div
        className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{
          animationDuration: `${duration}s`,
        }}
      />
    </div>
  );
}

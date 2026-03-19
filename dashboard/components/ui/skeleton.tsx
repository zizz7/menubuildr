import { cn } from '@/lib/utils';

function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}) {
  return (
    <div
      className={cn(
        'bg-muted',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'skeleton-wave',
        variant === 'circular' && 'rounded-full',
        variant === 'rounded' && 'rounded-lg',
        variant === 'text' && 'rounded-sm',
        variant === 'rectangular' && 'rounded-none',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: SkeletonProps) {
  const radiusClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`relative overflow-hidden bg-tertiary ${radiusClass} ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--color-bg-hover) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

export function SkeletonCommitRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-subtle">
      <Skeleton width={24} height={24} rounded="full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton height={14} width="70%" />
        <div className="flex gap-2">
          <Skeleton height={10} width={60} />
          <Skeleton height={10} width={80} />
          <Skeleton height={10} width={50} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonFileRow() {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <Skeleton width={16} height={16} rounded="sm" />
      <Skeleton height={12} className="flex-1" />
      <Skeleton width={30} height={12} />
    </div>
  );
}

export function SkeletonBranchRow() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Skeleton width={16} height={16} rounded="full" />
      <Skeleton height={12} width="60%" />
    </div>
  );
}

export function SkeletonDiff() {
  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 px-4 py-2 bg-tertiary">
        <Skeleton width={50} height={12} />
        <Skeleton height={12} className="flex-1" />
        <Skeleton width={40} height={12} />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-0 px-0 py-0">
          <Skeleton width={40} height={20} rounded="sm" />
          <Skeleton width={40} height={20} rounded="sm" />
          <Skeleton height={20} className="flex-1" rounded="sm" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3">
      <Skeleton height={16} width="40%" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton width={32} height={32} rounded="lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton height={12} width={`${60 + Math.random() * 30}%`} />
            <Skeleton height={10} width={`${30 + Math.random() * 30}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}

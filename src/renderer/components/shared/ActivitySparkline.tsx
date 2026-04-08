import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CommitNode } from '../../../shared/git-types';

interface ActivitySparklineProps {
  commits: CommitNode[];
  days?: number;
  height?: number;
  className?: string;
}

export function ActivitySparkline({
  commits,
  days = 30,
  height = 40,
  className = '',
}: ActivitySparklineProps) {
  const buckets = useMemo(() => {
    const now = Date.now();
    const msPerDay = 86400000;
    const counts = new Array(days).fill(0);

    for (const commit of commits) {
      const age = now - commit.authorDate * 1000;
      const dayIndex = Math.floor(age / msPerDay);
      if (dayIndex >= 0 && dayIndex < days) {
        counts[days - 1 - dayIndex]++;
      }
    }

    return counts;
  }, [commits, days]);

  const max = Math.max(...buckets, 1);
  const barWidth = 100 / days;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Background grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-full h-px bg-[var(--color-border-subtle)]" />
        ))}
      </div>

      {/* Bars */}
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {buckets.map((count, i) => {
          const barHeight = (count / max) * (height - 4);
          const x = i * barWidth + barWidth * 0.15;
          const w = barWidth * 0.7;

          return (
            <motion.rect
              key={i}
              x={x}
              y={height - barHeight}
              width={w}
              height={Math.max(barHeight, count > 0 ? 2 : 0)}
              rx={1}
              fill="url(#sparkGradient)"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                delay: i * 0.01,
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              style={{ transformOrigin: `${x + w / 2}px ${height}px` }}
            />
          );
        })}
      </svg>

      {/* Labels */}
      <div className="flex justify-between mt-1 text-[9px] text-tertiary">
        <span>{days}d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

interface ActivityHeatmapProps {
  commits: CommitNode[];
  weeks?: number;
  className?: string;
}

export function ActivityHeatmap({
  commits,
  weeks = 12,
  className = '',
}: ActivityHeatmapProps) {
  const grid = useMemo(() => {
    const now = Date.now();
    const msPerDay = 86400000;
    const totalDays = weeks * 7;
    const counts = new Array(totalDays).fill(0);

    for (const commit of commits) {
      const age = now - commit.authorDate * 1000;
      const dayIndex = Math.floor(age / msPerDay);
      if (dayIndex >= 0 && dayIndex < totalDays) {
        counts[totalDays - 1 - dayIndex]++;
      }
    }

    const max = Math.max(...counts, 1);
    return counts.map((c) => c / max);
  }, [commits, weeks]);

  return (
    <div className={`flex gap-[2px] ${className}`}>
      {Array.from({ length: weeks }).map((_, week) => (
        <div key={week} className="flex flex-col gap-[2px]">
          {Array.from({ length: 7 }).map((_, day) => {
            const idx = week * 7 + day;
            const intensity = grid[idx] || 0;

            return (
              <motion.div
                key={day}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.003 }}
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  backgroundColor:
                    intensity === 0
                      ? 'var(--color-bg-tertiary)'
                      : `color-mix(in srgb, var(--color-accent) ${Math.round(intensity * 100)}%, var(--color-bg-tertiary))`,
                }}
                title={`${Math.round(intensity * (Math.max(...grid.map((g) => g * (Math.max(...grid) || 1)))))} commits`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

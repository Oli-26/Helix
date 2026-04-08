import { motion } from 'framer-motion';

interface DiffStatBarProps {
  additions: number;
  deletions: number;
  maxBlocks?: number;
  className?: string;
}

export function DiffStatBar({
  additions,
  deletions,
  maxBlocks = 5,
  className = '',
}: DiffStatBarProps) {
  const total = additions + deletions;
  if (total === 0) return null;

  const addBlocks = Math.round((additions / total) * maxBlocks);
  const delBlocks = maxBlocks - addBlocks;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-xs text-secondary tabular-nums min-w-[2ch] text-right">
        {total}
      </span>
      <div className="flex gap-px">
        {Array.from({ length: maxBlocks }).map((_, i) => {
          const isAdd = i < addBlocks;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 500 }}
              className={`w-[7px] h-[7px] rounded-[1px] ${
                isAdd ? 'bg-success' : 'bg-danger'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DiffStatInlineProps {
  additions: number;
  deletions: number;
  className?: string;
}

export function DiffStatInline({
  additions,
  deletions,
  className = '',
}: DiffStatInlineProps) {
  const total = additions + deletions;
  if (total === 0) return null;

  const addPct = (additions / total) * 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 text-xs">
        {additions > 0 && <span className="text-success">+{additions}</span>}
        {deletions > 0 && <span className="text-danger">-{deletions}</span>}
      </div>
      <div className="w-16 h-1.5 rounded-full bg-tertiary overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${addPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-success rounded-l-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - addPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="h-full bg-danger rounded-r-full"
        />
      </div>
    </div>
  );
}

interface DiffStatSummaryProps {
  files: Array<{ stats?: { additions: number; deletions: number } }>;
  className?: string;
}

export function DiffStatSummary({ files, className = '' }: DiffStatSummaryProps) {
  const totals = files.reduce(
    (acc, f) => ({
      additions: acc.additions + (f.stats?.additions || 0),
      deletions: acc.deletions + (f.stats?.deletions || 0),
    }),
    { additions: 0, deletions: 0 },
  );

  const total = totals.additions + totals.deletions;
  if (total === 0) return null;

  const addPct = (totals.additions / total) * 100;
  const blocks = 30;
  const addBlocks = Math.round((addPct / 100) * blocks);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-secondary">
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </span>
        <div className="flex items-center gap-3">
          <span className="text-success font-medium">
            +{totals.additions} addition{totals.additions !== 1 ? 's' : ''}
          </span>
          <span className="text-danger font-medium">
            -{totals.deletions} deletion{totals.deletions !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex gap-px h-2 rounded-full overflow-hidden">
        {Array.from({ length: blocks }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.015, type: 'spring', stiffness: 300 }}
            className={`flex-1 ${i < addBlocks ? 'bg-success' : 'bg-danger'}`}
          />
        ))}
      </div>
    </div>
  );
}

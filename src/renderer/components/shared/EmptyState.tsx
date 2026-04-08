import { motion } from 'framer-motion';

interface EmptyStateProps {
  illustration: 'commits' | 'branches' | 'stashes' | 'search' | 'clean' | 'diff' | 'conflicts';
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="mb-6"
      >
        {illustrations[illustration]}
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-sm font-medium text-primary mb-1"
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-xs text-tertiary text-center max-w-[260px]"
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          {action}
        </motion.div>
      )}
    </div>
  );
}

const illustrations: Record<string, React.ReactNode> = {
  commits: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <motion.circle
        cx="40" cy="20" r="6"
        stroke="var(--color-accent)" strokeWidth="2"
        fill="var(--color-accent-muted)"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.line
        x1="40" y1="26" x2="40" y2="34"
        stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="40" cy="40" r="6"
        stroke="var(--color-success)" strokeWidth="2"
        fill="var(--color-success-muted)"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
      <motion.line
        x1="40" y1="46" x2="40" y2="54"
        stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle
        cx="40" cy="60" r="6"
        stroke="var(--color-graph-3)" strokeWidth="2"
        fill="var(--color-graph-3)"
        fillOpacity="0.15"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />
      {/* Branch line */}
      <motion.path
        d="M46 20 Q60 20 60 40 Q60 55 46 60"
        stroke="var(--color-graph-4)" strokeWidth="2" strokeLinecap="round" fill="none"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
      <motion.circle
        cx="60" cy="40" r="4"
        stroke="var(--color-graph-4)" strokeWidth="2"
        fill="var(--color-graph-4)"
        fillOpacity="0.15"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8 }}
      />
    </svg>
  ),

  branches: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <motion.line
        x1="40" y1="10" x2="40" y2="70"
        stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d="M40 25 Q55 25 55 40"
        stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.path
        d="M40 45 Q25 45 25 55"
        stroke="var(--color-graph-3)" strokeWidth="2" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      />
      {[
        { cx: 40, cy: 15, color: 'var(--color-accent)', delay: 0 },
        { cx: 40, cy: 25, color: 'var(--color-accent)', delay: 0.1 },
        { cx: 55, cy: 40, color: 'var(--color-success)', delay: 0.4 },
        { cx: 40, cy: 45, color: 'var(--color-accent)', delay: 0.2 },
        { cx: 25, cy: 55, color: 'var(--color-graph-3)', delay: 0.6 },
        { cx: 40, cy: 65, color: 'var(--color-accent)', delay: 0.3 },
      ].map((node, i) => (
        <motion.circle
          key={i}
          cx={node.cx} cy={node.cy} r="4"
          stroke={node.color} strokeWidth="2"
          fill={node.color} fillOpacity="0.2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: node.delay + 0.3, type: 'spring' }}
        />
      ))}
    </svg>
  ),

  stashes: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={20 + i * 3}
          y={20 + i * 8}
          width="40"
          height="28"
          rx="4"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          fill="var(--color-bg-secondary)"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 20 + i * 8, opacity: 1 - i * 0.25 }}
          transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
        />
      ))}
      <motion.text
        x="40" y="38" textAnchor="middle" fontSize="10" fill="var(--color-text-secondary)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        WIP
      </motion.text>
    </svg>
  ),

  search: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <motion.circle
        cx="35" cy="35" r="16"
        stroke="var(--color-accent)" strokeWidth="2.5"
        fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      />
      <motion.line
        x1="47" y1="47" x2="60" y2="60"
        stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      />
      <motion.circle
        cx="35" cy="35" r="8"
        fill="var(--color-accent-muted)"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  ),

  clean: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <motion.circle
        cx="40" cy="40" r="24"
        stroke="var(--color-success)" strokeWidth="2"
        fill="var(--color-success-muted)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      />
      <motion.path
        d="M28 40 L36 48 L52 32"
        stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      />
    </svg>
  ),

  diff: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="15" y="15" width="50" height="50" rx="6" stroke="var(--color-border)" strokeWidth="1.5" fill="var(--color-bg-secondary)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.rect
          key={i}
          x="22"
          y={24 + i * 8}
          width={20 + Math.random() * 20}
          height="4"
          rx="2"
          fill={i % 3 === 0 ? 'var(--color-success)' : i % 3 === 1 ? 'var(--color-danger)' : 'var(--color-text-tertiary)'}
          fillOpacity={i % 3 === 2 ? 0.3 : 0.5}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          style={{ transformOrigin: '22px 0' }}
        />
      ))}
    </svg>
  ),

  conflicts: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <motion.path
        d="M40 15 L60 55 L20 55 Z"
        stroke="var(--color-warning)" strokeWidth="2.5" strokeLinejoin="round"
        fill="var(--color-warning-muted)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      />
      <motion.text
        x="40" y="47" textAnchor="middle" fontSize="22" fontWeight="bold" fill="var(--color-warning)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6, 1] }}
        transition={{ delay: 0.3, duration: 1 }}
      >
        !
      </motion.text>
    </svg>
  ),
};

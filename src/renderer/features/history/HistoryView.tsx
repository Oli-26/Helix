import { Allotment } from 'allotment';
import { Virtuoso } from 'react-virtuoso';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, Tag, GitBranch } from 'lucide-react';
import { useCommitLog } from '../../hooks/useCommitLog';
import { useUIStore } from '../../stores/ui-store';
import type { CommitNode } from '../../../shared/git-types';
import { CommitGraph } from './CommitGraph';
import { CommitDetail } from './CommitDetail';

export function HistoryView() {
  const repoPath = useUIStore((s) => s.repoPath);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const setSelectedCommit = useUIStore((s) => s.setSelectedCommit);
  const { data: commits, isLoading } = useCommitLog(repoPath);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Allotment vertical>
      <Allotment.Pane>
        <div className="h-full flex">
          {/* Graph column */}
          <CommitGraph commits={commits || []} />

          {/* Commit list */}
          <div className="flex-1 overflow-hidden">
            <Virtuoso
              data={commits || []}
              itemContent={(index, commit) => (
                <CommitRow
                  commit={commit}
                  isSelected={selectedCommit === commit.hash}
                  onClick={() => setSelectedCommit(commit.hash)}
                />
              )}
              style={{ height: '100%' }}
              overscan={50}
            />
          </div>
        </div>
      </Allotment.Pane>
      {selectedCommit && (
        <Allotment.Pane minSize={200} preferredSize={300}>
          <CommitDetail hash={selectedCommit} />
        </Allotment.Pane>
      )}
    </Allotment>
  );
}

function CommitRow({
  commit,
  isSelected,
  onClick,
}: {
  commit: CommitNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(commit.authorDate * 1000), {
    addSuffix: true,
  });

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-left border-b border-subtle transition-colors
        ${isSelected ? 'bg-accent-muted' : 'hover:bg-hover'}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm text-primary truncate">
            {commit.subject}
          </span>
          {commit.refs
            .filter((r) => !r.startsWith('tag:'))
            .map((ref) => (
              <span
                key={ref}
                className="inline-flex items-center gap-1 px-1.5 py-0 text-xs rounded bg-accent-muted text-accent font-medium flex-shrink-0"
              >
                <GitBranch className="w-3 h-3" />
                {ref.replace('HEAD -> ', '')}
              </span>
            ))}
          {commit.refs
            .filter((r) => r.startsWith('tag:'))
            .map((ref) => (
              <span
                key={ref}
                className="inline-flex items-center gap-1 px-1.5 py-0 text-xs rounded bg-warning-muted text-warning font-medium flex-shrink-0"
              >
                <Tag className="w-3 h-3" />
                {ref.replace('tag: ', '')}
              </span>
            ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <span className="font-mono">{commit.abbreviatedHash}</span>
          <span>{commit.authorName}</span>
          <span>{timeAgo}</span>
        </div>
      </div>
    </button>
  );
}

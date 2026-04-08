import { useState, useRef, useCallback } from 'react';
import { Allotment } from 'allotment';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, Tag, GitBranch, Loader2, ChevronDown } from 'lucide-react';
import { useCommitLog } from '../../hooks/useCommitLog';
import { useUIStore } from '../../stores/ui-store';
import type { CommitNode } from '../../../shared/git-types';
import { CommitGraph } from './CommitGraph';
import { CommitDetail } from './CommitDetail';
import { SkeletonCommitRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';

const INITIAL_COUNT = 500;
const LOAD_MORE_COUNT = 500;

export function HistoryView() {
  const repoPath = useUIStore((s) => s.repoPath);
  const selectedCommit = useUIStore((s) => s.selectedCommit);
  const setSelectedCommit = useUIStore((s) => s.setSelectedCommit);
  const [maxCount, setMaxCount] = useState(INITIAL_COUNT);
  const { data: commits, isLoading } = useCommitLog(repoPath, maxCount);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(800);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setVisibleHeight(e.currentTarget.clientHeight);
  }, []);

  const loadMore = () => {
    setMaxCount((c) => c + LOAD_MORE_COUNT);
  };

  if (isLoading && !commits) {
    return (
      <div className="h-full overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <SkeletonCommitRow key={i} />
        ))}
      </div>
    );
  }

  if (!commits || commits.length === 0) {
    return (
      <EmptyState
        illustration="commits"
        title="No commits yet"
        description="This repository has no commit history"
      />
    );
  }

  return (
    <Allotment vertical>
      <Allotment.Pane>
        <div className="h-full flex">
          {/* Graph column — only show for manageable sizes */}
          {commits.length <= 200 && (
            <div className="overflow-hidden flex-shrink-0" style={{ marginTop: -scrollTop }}>
              <CommitGraph
                commits={commits}
                scrollTop={scrollTop}
                visibleHeight={visibleHeight}
              />
            </div>
          )}

          {/* Commit list */}
          <div className="flex-1 overflow-hidden">
            <Virtuoso
              data={commits}
              itemContent={(index, commit) => (
                <CommitRow
                  commit={commit}
                  isSelected={selectedCommit === commit.hash}
                  onClick={() => setSelectedCommit(commit.hash)}
                />
              )}
              style={{ height: '100%' }}
              overscan={30}
              onScroll={(e) => handleScroll(e as unknown as React.UIEvent<HTMLDivElement>)}
              components={{
                Footer: () =>
                  commits.length >= maxCount ? (
                    <button
                      onClick={loadMore}
                      className="w-full flex items-center justify-center gap-2 py-3 text-xs text-accent hover:text-accent-hover hover:bg-hover transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      Load more commits
                    </button>
                  ) : null,
              }}
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
            .slice(0, 3)
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
            .slice(0, 2)
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

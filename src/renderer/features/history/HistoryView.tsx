import { useState, useRef, useCallback, useEffect } from 'react';
import { Allotment } from 'allotment';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, Tag, GitBranch, ChevronDown } from 'lucide-react';
import { useCommitLog } from '../../hooks/useCommitLog';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore , useRepoPath, useSelectedCommit } from '../../stores/ui-store';
import type { CommitNode } from '../../../shared/git-types';
import { CommitGraph } from './CommitGraph';
import { CommitDetail } from './CommitDetail';
import { SkeletonCommitRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';

const INITIAL_COUNT = 500;
const LOAD_MORE_COUNT = 500;

export function HistoryView() {
  const repoPath = useRepoPath();
  const selectedCommit = useSelectedCommit();
  const setSelectedCommit = useUIStore((s) => s.setSelectedCommit);
  const [maxCount, setMaxCount] = useState(INITIAL_COUNT);
  const { data: commits, isLoading } = useCommitLog(repoPath, maxCount);
  const { data: repo } = useRepository(repoPath);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(800);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevBranchRef = useRef<string | null>(null);

  // When the current branch changes, find and select its HEAD commit
  useEffect(() => {
    if (!repo?.currentBranch || !commits || commits.length === 0) return;
    if (prevBranchRef.current === repo.currentBranch) return;
    prevBranchRef.current = repo.currentBranch;

    // Find the commit that has "HEAD -> branchName" in its refs
    const headRef = `HEAD -> ${repo.currentBranch}`;
    const idx = commits.findIndex((c) =>
      c.refs.some((r) => r === headRef || r === repo.currentBranch),
    );

    if (idx >= 0) {
      setSelectedCommit(commits[idx].hash);
      // Scroll to that commit
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: idx,
          align: 'center',
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [repo?.currentBranch, commits, setSelectedCommit]);

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

  // Find the HEAD commit index for highlight
  const headRef = repo?.currentBranch
    ? `HEAD -> ${repo.currentBranch}`
    : null;
  const headCommitHash = headRef
    ? commits.find((c) => c.refs.some((r) => r === headRef))?.hash
    : null;

  return (
    <Allotment vertical>
      <Allotment.Pane>
        <div className="h-full flex">
          {/* Graph column */}
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
              ref={virtuosoRef}
              data={commits}
              itemContent={(index, commit) => (
                <CommitRow
                  commit={commit}
                  isSelected={selectedCommit === commit.hash}
                  isHead={commit.hash === headCommitHash}
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
  isHead,
  onClick,
}: {
  commit: CommitNode;
  isSelected: boolean;
  isHead: boolean;
  onClick: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(commit.authorDate * 1000), {
    addSuffix: true,
  });

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-left border-b transition-colors
        ${isSelected ? 'bg-accent-muted border-accent/30' : isHead ? 'bg-success-muted border-success/20' : 'border-subtle hover:bg-hover'}
      `}
    >
      {/* HEAD indicator dot */}
      {isHead && (
        <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" title="HEAD" />
      )}
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
                className={`inline-flex items-center gap-1 px-1.5 py-0 text-xs rounded font-medium flex-shrink-0 ${
                  ref.startsWith('HEAD -> ')
                    ? 'bg-success-muted text-success'
                    : 'bg-accent-muted text-accent'
                }`}
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

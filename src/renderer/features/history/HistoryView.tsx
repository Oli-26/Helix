import { useState, useRef, useCallback, useEffect } from 'react';
import { Allotment } from 'allotment';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCommit, Tag, GitBranch, ChevronDown, CherryIcon, Undo2,
  RotateCcw, Copy, GitBranchPlus, Hash, Eye, Loader2,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommitLog } from '../../hooks/useCommitLog';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore, useRepoPath, useSelectedCommit } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { CommitNode } from '../../../shared/git-types';
import { CommitGraph } from './CommitGraph';
import { CommitDetail } from './CommitDetail';
import { SkeletonCommitRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

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
  const queryClient = useQueryClient();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; items: ContextMenuItem[];
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string;
    danger?: boolean; confirmLabel?: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const closeModal = () => setConfirmModal((s) => ({ ...s, open: false }));

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const cherryPickMutation = useMutation({
    mutationFn: (hash: string) => gitApi.cherryPick(repoPath!, hash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Cherry-pick successful');
    },
    onError: (err: any) => toast.error('Cherry-pick failed', err.message),
  });

  const revertMutation = useMutation({
    mutationFn: (hash: string) => gitApi.revertCommit(repoPath!, hash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Revert successful');
    },
    onError: (err: any) => toast.error('Revert failed', err.message),
  });

  const resetMutation = useMutation({
    mutationFn: ({ hash, mode }: { hash: string; mode: 'soft' | 'mixed' | 'hard' }) =>
      gitApi.resetTo(repoPath!, hash, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Reset successful');
    },
    onError: (err: any) => toast.error('Reset failed', err.message),
  });

  const createBranchMutation = useMutation({
    mutationFn: ({ name, startPoint }: { name: string; startPoint: string }) =>
      gitApi.createBranch(repoPath!, name, startPoint),
    onSuccess: (_d, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Branch created', name);
    },
    onError: (err: any) => toast.error('Create branch failed', err.message),
  });

  // When the current branch changes, find and select its HEAD commit
  useEffect(() => {
    if (!repo?.currentBranch || !commits || commits.length === 0) return;
    if (prevBranchRef.current === repo.currentBranch) return;
    prevBranchRef.current = repo.currentBranch;

    const headRef = `HEAD -> ${repo.currentBranch}`;
    const idx = commits.findIndex((c) =>
      c.refs.some((r) => r === headRef || r === repo.currentBranch),
    );

    if (idx >= 0) {
      setSelectedCommit(commits[idx].hash);
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: idx,
          align: 'center',
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [repo?.currentBranch, commits, setSelectedCommit]);

  // Close context menu
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  // Keyboard navigation
  useEffect(() => {
    if (!commits || commits.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (contextMenu) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev === null ? 0 : Math.min(prev + 1, commits.length - 1);
          setSelectedCommit(commits[next].hash);
          virtuosoRef.current?.scrollToIndex({ index: next, align: 'center', behavior: 'smooth' });
          return next;
        });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev === null ? 0 : Math.max(prev - 1, 0);
          setSelectedCommit(commits[next].hash);
          virtuosoRef.current?.scrollToIndex({ index: next, align: 'center', behavior: 'smooth' });
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commits, contextMenu, setSelectedCommit]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setVisibleHeight(e.currentTarget.clientHeight);
  }, []);

  const loadMore = () => {
    setMaxCount((c) => c + LOAD_MORE_COUNT);
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, commit: CommitNode) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedCommit(commit.hash);

      const items: ContextMenuItem[] = [
        {
          label: 'Copy Commit Hash',
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            navigator.clipboard.writeText(commit.hash);
            toast.info('Copied', commit.abbreviatedHash);
          },
        },
        {
          label: 'Copy Commit Message',
          icon: <Hash className="w-3.5 h-3.5" />,
          onClick: () => {
            navigator.clipboard.writeText(commit.subject);
            toast.info('Copied message');
          },
        },
        { separator: true, label: '' },
        {
          label: 'Cherry-pick',
          icon: <CherryIcon className="w-3.5 h-3.5" />,
          onClick: () => cherryPickMutation.mutate(commit.hash),
        },
        {
          label: 'Revert',
          icon: <Undo2 className="w-3.5 h-3.5" />,
          onClick: () => {
            setConfirmModal({
              open: true,
              title: 'Revert Commit',
              message: `Create a new commit that undoes changes from "${commit.subject}" (${commit.abbreviatedHash})?`,
              confirmLabel: 'Revert',
              onConfirm: () => { revertMutation.mutate(commit.hash); closeModal(); },
            });
          },
        },
        { separator: true, label: '' },
        {
          label: 'Create Branch Here...',
          icon: <GitBranchPlus className="w-3.5 h-3.5" />,
          onClick: () => {
            const name = window.prompt('New branch name:');
            if (name?.trim()) {
              createBranchMutation.mutate({ name: name.trim(), startPoint: commit.hash });
            }
          },
        },
        { separator: true, label: '' },
        {
          label: 'Reset (soft) to here',
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          onClick: () => resetMutation.mutate({ hash: commit.hash, mode: 'soft' }),
        },
        {
          label: 'Reset (mixed) to here',
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          onClick: () => resetMutation.mutate({ hash: commit.hash, mode: 'mixed' }),
        },
        {
          label: 'Reset (hard) to here',
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          danger: true,
          onClick: () => {
            setConfirmModal({
              open: true,
              title: 'Hard Reset',
              message: `Reset to ${commit.abbreviatedHash}? This will DISCARD all uncommitted changes and move HEAD. This cannot be undone.`,
              danger: true,
              confirmLabel: 'Reset Hard',
              onConfirm: () => { resetMutation.mutate({ hash: commit.hash, mode: 'hard' }); closeModal(); },
            });
          },
        },
      ];

      const x = Math.min(e.clientX, window.innerWidth - 260);
      const y = Math.min(e.clientY, window.innerHeight - items.filter((i) => !i.separator).length * 36 - 16);
      setContextMenu({ x, y, items });
    },
    [setSelectedCommit, cherryPickMutation, revertMutation, resetMutation, createBranchMutation],
  );

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
          {commits.length <= 200 && (
            <div className="overflow-hidden flex-shrink-0" style={{ marginTop: -scrollTop }}>
              <CommitGraph
                commits={commits}
                scrollTop={scrollTop}
                visibleHeight={visibleHeight}
              />
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <Virtuoso
              ref={virtuosoRef}
              data={commits}
              itemContent={(index, commit) => (
                <CommitRow
                  commit={commit}
                  isSelected={selectedCommit === commit.hash}
                  isHead={commit.hash === headCommitHash}
                  onClick={() => {
                    setSelectedCommit(commit.hash);
                    setFocusedIndex(index);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, commit)}
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

          {/* Context menu */}
          <AnimatePresence>
            {contextMenu && (
              <motion.div
                ref={contextMenuRef}
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                className="fixed z-[200] min-w-[240px] bg-popover border border-default rounded-lg py-1 overflow-hidden"
                style={{ left: contextMenu.x, top: contextMenu.y, boxShadow: 'var(--shadow-lg)' }}
              >
                {contextMenu.items.map((item, index) => {
                  if (item.separator) {
                    return <div key={`sep-${index}`} className="h-px bg-[var(--color-border)] my-1 mx-2" />;
                  }
                  return (
                    <button
                      key={item.label}
                      onClick={() => { if (!item.disabled) { item.onClick?.(); setContextMenu(null); } }}
                      disabled={item.disabled}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 text-[13px] transition-colors text-left ${
                        item.disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
                      } ${item.danger ? 'text-danger hover:bg-danger-muted' : 'text-primary hover:bg-hover'}`}
                    >
                      {item.icon && (
                        <span className="w-4 h-4 flex items-center justify-center text-secondary flex-shrink-0">
                          {item.icon}
                        </span>
                      )}
                      <span className="flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Allotment.Pane>
      {selectedCommit && (
        <Allotment.Pane minSize={200} preferredSize={300}>
          <CommitDetail hash={selectedCommit} />
        </Allotment.Pane>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        danger={confirmModal.danger}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeModal}
      />
    </Allotment>
  );
}

function CommitRow({
  commit,
  isSelected,
  isHead,
  onClick,
  onContextMenu,
}: {
  commit: CommitNode;
  isSelected: boolean;
  isHead: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(commit.authorDate * 1000), {
    addSuffix: true,
  });

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-left border-b transition-colors group
        ${isSelected
          ? 'bg-accent-muted border-accent/30'
          : isHead
            ? 'bg-success-muted border-success/20'
            : 'border-subtle hover:bg-hover'
        }
      `}
    >
      {isHead && (
        <div className="w-2 h-2 rounded-full bg-success flex-shrink-0 animate-pulse" title="HEAD" />
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
                className={`inline-flex items-center gap-1 px-1.5 py-0 text-[11px] rounded font-medium flex-shrink-0 ${
                  ref.startsWith('HEAD -> ')
                    ? 'bg-success-muted text-success'
                    : 'bg-accent-muted text-accent'
                }`}
              >
                <GitBranch className="w-2.5 h-2.5" />
                {ref.replace('HEAD -> ', '')}
              </span>
            ))}
          {commit.refs
            .filter((r) => r.startsWith('tag:'))
            .slice(0, 2)
            .map((ref) => (
              <span
                key={ref}
                className="inline-flex items-center gap-1 px-1.5 py-0 text-[11px] rounded bg-warning-muted text-warning font-medium flex-shrink-0"
              >
                <Tag className="w-2.5 h-2.5" />
                {ref.replace('tag: ', '')}
              </span>
            ))}
          {commit.refs.filter((r) => !r.startsWith('tag:')).length > 3 && (
            <span className="text-[10px] text-tertiary flex-shrink-0">
              +{commit.refs.filter((r) => !r.startsWith('tag:')).length - 3}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <span className="font-mono">{commit.abbreviatedHash}</span>
          <span className="truncate max-w-[120px]">{commit.authorName}</span>
          <span className="flex-shrink-0">{timeAgo}</span>
        </div>
      </div>

      {/* Hover action buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(commit.hash);
            toast.info('Copied', commit.abbreviatedHash);
          }}
          className="p-1.5 rounded text-tertiary hover:text-primary hover:bg-tertiary transition-colors"
          title="Copy hash"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </button>
  );
}

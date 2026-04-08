import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  FileWarning,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useStatus } from '../../hooks/useStatus';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import type { FileStatus } from '../../../shared/git-types';

export function ConflictView() {
  const repoPath = useUIStore((s) => s.repoPath);
  const { data: repo } = useRepository(repoPath);
  const { data: files } = useStatus(repoPath);
  const queryClient = useQueryClient();

  const conflictedFiles =
    files?.filter(
      (f) => f.workingDir === 'U' || f.index === 'U',
    ) || [];

  const isInConflict =
    repo?.state === 'merging' ||
    repo?.state === 'rebasing' ||
    repo?.state === 'cherry-picking';

  const abortMutation = useMutation({
    mutationFn: async () => {
      // Abort the current operation
      const git = repoPath!;
      if (repo?.state === 'merging') {
        await window.api.invoke('git:merge' as any, {
          repoPath: git,
          branch: '--abort',
        });
      }
      // For rebase/cherry-pick, we'd need specific abort commands
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['git'] }),
  });

  const markResolvedMutation = useMutation({
    mutationFn: (filePath: string) => gitApi.stage(repoPath!, [filePath]),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] }),
  });

  if (!isInConflict && conflictedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-secondary">
        <Check className="w-12 h-12 mb-3 text-success" />
        <span className="text-sm font-medium">No conflicts</span>
        <span className="text-xs text-tertiary mt-1">
          Everything is clean
        </span>
      </div>
    );
  }

  const stateLabel = {
    merging: 'Merge',
    rebasing: 'Rebase',
    'cherry-picking': 'Cherry-pick',
    clean: '',
    reverting: 'Revert',
    bisecting: 'Bisect',
  };

  return (
    <div className="h-full flex flex-col bg-primary">
      {/* Warning banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 bg-warning-muted border-b border-default"
      >
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium text-primary">
            {stateLabel[repo?.state || 'clean']} in progress — {conflictedFiles.length}{' '}
            conflict{conflictedFiles.length !== 1 ? 's' : ''} to resolve
          </div>
          <div className="text-xs text-secondary mt-0.5">
            Resolve each file, then mark as resolved to continue
          </div>
        </div>
        <button
          onClick={() => abortMutation.mutate()}
          disabled={abortMutation.isPending}
          className="px-3 py-1.5 bg-danger text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {abortMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Abort {stateLabel[repo?.state || 'clean']}
        </button>
      </motion.div>

      {/* Conflicted files */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {conflictedFiles.map((file) => (
            <ConflictFileItem
              key={file.path}
              file={file}
              onMarkResolved={() =>
                markResolvedMutation.mutate(file.path)
              }
              isResolving={
                markResolvedMutation.isPending &&
                markResolvedMutation.variables === file.path
              }
            />
          ))}
        </AnimatePresence>

        {conflictedFiles.length === 0 && isInConflict && (
          <div className="text-center py-8">
            <Check className="w-8 h-8 text-success mx-auto mb-2" />
            <div className="text-sm text-primary font-medium mb-1">
              All conflicts resolved
            </div>
            <div className="text-xs text-secondary mb-4">
              You can now continue the {stateLabel[repo?.state || 'clean'].toLowerCase()}
            </div>
            <button className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors inline-flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Continue {stateLabel[repo?.state || 'clean']}
            </button>
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="p-4 border-t border-default bg-secondary flex-shrink-0">
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
          How to resolve conflicts
        </h3>
        <div className="space-y-1.5 text-xs text-tertiary">
          <div className="flex items-start gap-2">
            <span className="text-accent font-bold mt-px">1.</span>
            <span>Open the conflicted file in your editor</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent font-bold mt-px">2.</span>
            <span>
              Look for conflict markers{' '}
              <code className="px-1 py-0.5 bg-tertiary rounded text-secondary">
                {'<<<<<<< ======= >>>>>>>'}
              </code>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent font-bold mt-px">3.</span>
            <span>Choose which changes to keep, remove the markers</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent font-bold mt-px">4.</span>
            <span>Click "Mark Resolved" to stage the file</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConflictFileItem({
  file,
  onMarkResolved,
  isResolving,
}: {
  file: FileStatus;
  onMarkResolved: () => void;
  isResolving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="mb-2 rounded-lg border border-default overflow-hidden"
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-4 py-3 bg-secondary hover:bg-hover cursor-pointer transition-colors"
      >
        <FileWarning className="w-4 h-4 text-warning flex-shrink-0" />
        <span className="flex-1 text-sm font-mono text-primary truncate">
          {file.path}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkResolved();
            }}
            disabled={isResolving}
            className="px-2.5 py-1 bg-success text-white rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isResolving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Mark Resolved
          </button>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
            <ChevronRight className="w-4 h-4 text-tertiary" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-primary border-t border-default">
              <div className="flex gap-2 text-xs">
                <button className="px-3 py-1.5 rounded bg-accent-muted text-accent font-medium hover:bg-accent hover:text-[var(--color-text-inverse)] transition-colors">
                  Accept Ours
                </button>
                <button className="px-3 py-1.5 rounded bg-success-muted text-success font-medium hover:bg-success hover:text-white transition-colors">
                  Accept Theirs
                </button>
                <button className="px-3 py-1.5 rounded bg-tertiary text-secondary font-medium hover:bg-hover transition-colors">
                  Accept Both
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

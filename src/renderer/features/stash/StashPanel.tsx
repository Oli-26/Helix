import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Play,
  Trash2,
  Plus,
  Package,
  Clock,
  Loader2,
} from 'lucide-react';
import { useUIStore , useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import type { StashEntry } from '../../../shared/git-types';

export function StashPanel() {
  const repoPath = useRepoPath();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [stashMessage, setStashMessage] = useState('');

  const stashQuery = useQuery({
    queryKey: ['git', 'stash-list', repoPath],
    queryFn: () => gitApi.getStashList(repoPath!),
    enabled: !!repoPath,
  });

  const saveMutation = useMutation({
    mutationFn: (message?: string) =>
      gitApi.stashSave(repoPath!, message),
    onSuccess: () => {
      setStashMessage('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['git'] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (index: number) => gitApi.stashApply(repoPath!, index),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] }),
  });

  const dropMutation = useMutation({
    mutationFn: (index: number) => gitApi.stashDrop(repoPath!, index),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git', 'stash-list'] }),
  });

  const stashes = stashQuery.data || [];

  return (
    <div className="h-full flex flex-col bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-default flex-shrink-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Archive className="w-4 h-4 text-accent" />
          Stashes ({stashes.length})
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-text-inverse rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Stash
        </button>
      </div>

      {/* Create stash */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-default"
          >
            <div className="p-4 space-y-2">
              <input
                type="text"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                placeholder="Stash message (optional)..."
                className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveMutation.mutate(
                      stashMessage.trim() || undefined,
                    );
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    saveMutation.mutate(stashMessage.trim() || undefined)
                  }
                  disabled={saveMutation.isPending}
                  className="flex-1 py-2 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  Save Stash
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-tertiary text-secondary rounded-lg text-sm hover:bg-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stash list */}
      <div className="flex-1 overflow-y-auto">
        {stashes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <Package className="w-10 h-10 mb-3 text-tertiary" />
            <span className="text-sm">No stashes</span>
            <span className="text-xs text-tertiary mt-1">
              Stash your work to switch context
            </span>
          </div>
        ) : (
          <div className="p-2">
            <AnimatePresence>
              {stashes.map((stash) => (
                <StashItem
                  key={stash.index}
                  stash={stash}
                  onApply={() => applyMutation.mutate(stash.index)}
                  onDrop={() => dropMutation.mutate(stash.index)}
                  isApplying={
                    applyMutation.isPending &&
                    applyMutation.variables === stash.index
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function StashItem({
  stash,
  onApply,
  onDrop,
  isApplying,
}: {
  stash: StashEntry;
  onApply: () => void;
  onDrop: () => void;
  isApplying: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-hover transition-colors group mb-1"
    >
      <Archive className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-primary truncate">
          {stash.message || `stash@{${stash.index}}`}
        </div>
        <div className="flex items-center gap-2 text-xs text-tertiary mt-0.5">
          <Clock className="w-3 h-3" />
          <span>{stash.date}</span>
          <span className="font-mono">{stash.hash.slice(0, 7)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onApply}
          disabled={isApplying}
          className="p-1.5 rounded text-success hover:bg-success-muted transition-colors"
          title="Apply stash"
        >
          {isApplying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={onDrop}
          className="p-1.5 rounded text-danger hover:bg-danger-muted transition-colors"
          title="Drop stash"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

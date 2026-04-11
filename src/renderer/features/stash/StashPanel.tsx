import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive, Play, Trash2, Plus, Package, Clock, Loader2,
  ChevronRight, Download,
} from 'lucide-react';
import { useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { toast } from '../../components/ui/Toast';
import { UnifiedDiff } from '../diff/UnifiedDiff';
import { DiffStatBar } from '../../components/shared/DiffStatBar';
import { FileIcon } from '../../components/shared/FileIcon';
import type { StashEntry, DiffFile } from '../../../shared/git-types';

export function StashPanel() {
  const repoPath = useRepoPath();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [expandedStash, setExpandedStash] = useState<number | null>(null);

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
      toast.success('Changes stashed');
    },
    onError: (err: any) => toast.error('Stash failed', err.message),
  });

  const applyMutation = useMutation({
    mutationFn: (index: number) => gitApi.stashApply(repoPath!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] });
      toast.success('Stash applied');
    },
    onError: (err: any) => toast.error('Apply failed', err.message),
  });

  const popMutation = useMutation({
    mutationFn: (index: number) => gitApi.stashPop(repoPath!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Stash popped');
    },
    onError: (err: any) => toast.error('Pop failed', err.message),
  });

  const dropMutation = useMutation({
    mutationFn: (index: number) => gitApi.stashDrop(repoPath!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git', 'stash-list'] });
      toast.success('Stash dropped');
    },
    onError: (err: any) => toast.error('Drop failed', err.message),
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
                    saveMutation.mutate(stashMessage.trim() || undefined);
                  }
                  if (e.key === 'Escape') setShowCreate(false);
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
                  repoPath={repoPath!}
                  isExpanded={expandedStash === stash.index}
                  onToggle={() =>
                    setExpandedStash(
                      expandedStash === stash.index ? null : stash.index,
                    )
                  }
                  onApply={() => applyMutation.mutate(stash.index)}
                  onPop={() => popMutation.mutate(stash.index)}
                  onDrop={() => dropMutation.mutate(stash.index)}
                  isApplying={
                    applyMutation.isPending &&
                    applyMutation.variables === stash.index
                  }
                  isPopping={
                    popMutation.isPending &&
                    popMutation.variables === stash.index
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
  repoPath,
  isExpanded,
  onToggle,
  onApply,
  onPop,
  onDrop,
  isApplying,
  isPopping,
}: {
  stash: StashEntry;
  repoPath: string;
  isExpanded: boolean;
  onToggle: () => void;
  onApply: () => void;
  onPop: () => void;
  onDrop: () => void;
  isApplying: boolean;
  isPopping: boolean;
}) {
  // Fetch diff for this stash when expanded
  const { data: diffFiles } = useQuery({
    queryKey: ['git', 'diff-commit', repoPath, stash.hash],
    queryFn: () => gitApi.getDiffForCommit(repoPath, stash.hash),
    enabled: isExpanded,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-lg border border-transparent hover:border-default transition-colors mb-1"
    >
      <div className="flex items-start gap-3 px-3 py-3 cursor-pointer group" onClick={onToggle}>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="mt-0.5 flex-shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5 text-tertiary" />
        </motion.div>
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
            onClick={(e) => { e.stopPropagation(); onPop(); }}
            disabled={isPopping}
            className="p-1.5 rounded text-accent hover:bg-accent-muted transition-colors"
            title="Pop stash (apply + drop)"
          >
            {isPopping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onApply(); }}
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
            onClick={(e) => { e.stopPropagation(); onDrop(); }}
            className="p-1.5 rounded text-danger hover:bg-danger-muted transition-colors"
            title="Drop stash"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable diff */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-default"
          >
            {diffFiles ? (
              <div className="max-h-[500px] overflow-y-auto">
                {diffFiles.map((file) => (
                  <StashFileItem key={file.newPath} file={file} />
                ))}
                {diffFiles.length === 0 && (
                  <div className="px-4 py-6 text-xs text-tertiary text-center">
                    No changes in this stash
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 text-xs text-tertiary">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading diff...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StashFileItem({ file }: { file: DiffFile }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs text-left transition-colors ${
          expanded ? 'bg-tertiary' : 'hover:bg-hover'
        }`}
      >
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight className="w-3 h-3 text-tertiary" />
        </motion.div>
        <FileIcon filename={file.newPath} />
        <span className="text-primary truncate flex-1 font-mono">{file.newPath}</span>
        {file.stats && (
          <DiffStatBar additions={file.stats.additions} deletions={file.stats.deletions} />
        )}
      </button>
      <AnimatePresence>
        {expanded && file.hunks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-default"
          >
            <div className="max-h-[300px] overflow-auto">
              <UnifiedDiff file={file} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  GitBranch,
  Check,
  AlertTriangle,
  MinusCircle,
  Loader2,
  Download,
  Link2,
  FolderGit2,
  ChevronRight,
  Hash,
  Globe,
} from 'lucide-react';
import { useUIStore , useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { toast } from '../../components/ui/Toast';
import { ContextMenu } from '../../components/ui/ContextMenu';
import { EmptyState } from '../../components/shared/EmptyState';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import type { SubmoduleInfo } from '../../../shared/submodule-types';

export function SubmodulePanel() {
  const repoPath = useRepoPath();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addPath, setAddPath] = useState('');

  const submodulesQuery = useQuery({
    queryKey: ['git', 'submodules', repoPath],
    queryFn: () => gitApi.getSubmodules(repoPath!),
    enabled: !!repoPath,
    staleTime: 15_000,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      gitApi.addSubmodule(repoPath!, addUrl.trim(), addPath.trim() || undefined),
    onSuccess: () => {
      toast.success('Submodule added', addUrl.trim());
      setAddUrl('');
      setAddPath('');
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['git', 'submodules'] });
    },
    onError: (err: Error) => {
      toast.error('Failed to add submodule', err.message);
    },
  });

  const updateAllMutation = useMutation({
    mutationFn: () =>
      gitApi.updateSubmodules(repoPath!, undefined, true, true),
    onSuccess: () => {
      toast.success('Submodules updated');
      queryClient.invalidateQueries({ queryKey: ['git', 'submodules'] });
    },
    onError: (err: Error) => {
      toast.error('Update failed', err.message);
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => gitApi.syncSubmodules(repoPath!),
    onSuccess: () => {
      toast.success('Submodules synced');
      queryClient.invalidateQueries({ queryKey: ['git', 'submodules'] });
    },
    onError: (err: Error) => {
      toast.error('Sync failed', err.message);
    },
  });

  const submodules = submodulesQuery.data || [];

  if (submodulesQuery.isLoading) {
    return <SkeletonPanel rows={3} />;
  }

  return (
    <div className="h-full flex flex-col bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-default flex-shrink-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <FolderGit2 className="w-4 h-4 text-accent" />
          Submodules
          <span className="text-xs text-tertiary font-normal">
            ({submodules.length})
          </span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending || submodules.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors disabled:opacity-50"
            title="Sync all submodule URLs"
          >
            {syncAllMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            Sync
          </button>
          <button
            onClick={() => updateAllMutation.mutate()}
            disabled={updateAllMutation.isPending || submodules.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors disabled:opacity-50"
            title="Update all submodules (--init --recursive)"
          >
            {updateAllMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Update All
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent text-text-inverse rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Add submodule form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-default"
          >
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-secondary">
                  Repository URL
                </label>
                <input
                  type="text"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors font-mono"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-secondary">
                  Path (optional)
                </label>
                <input
                  type="text"
                  value={addPath}
                  onChange={(e) => setAddPath(e.target.value)}
                  placeholder="libs/my-submodule"
                  className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={!addUrl.trim() || addMutation.isPending}
                  className="flex-1 py-2 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Submodule
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 bg-tertiary text-secondary rounded-lg text-sm hover:bg-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submodule list */}
      <div className="flex-1 overflow-y-auto">
        {submodules.length === 0 ? (
          <EmptyState
            illustration="branches"
            title="No submodules"
            description="Submodules let you include other Git repositories within your project"
            action={
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Submodule
              </button>
            }
          />
        ) : (
          <div className="p-2">
            <AnimatePresence>
              {submodules.map((sub, index) => (
                <SubmoduleItem
                  key={sub.path}
                  submodule={sub}
                  index={index}
                  repoPath={repoPath!}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Info footer */}
      {submodules.length > 0 && (
        <div className="px-4 py-2 border-t border-default bg-secondary flex-shrink-0">
          <div className="flex items-center gap-4 text-[10px] text-tertiary">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success" />
              Up to date
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              Modified
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger" />
              Dirty
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-tertiary" />
              Uninitialized
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmoduleItem({
  submodule,
  index,
  repoPath,
}: {
  submodule: SubmoduleInfo;
  index: number;
  repoPath: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () =>
      gitApi.updateSubmodules(repoPath, [submodule.path], true, true),
    onSuccess: () => {
      toast.success('Submodule updated', submodule.path);
      queryClient.invalidateQueries({ queryKey: ['git', 'submodules'] });
    },
    onError: (err: Error) => {
      toast.error('Update failed', err.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => gitApi.removeSubmodule(repoPath, submodule.path),
    onSuccess: () => {
      toast.success('Submodule removed', submodule.path);
      queryClient.invalidateQueries({ queryKey: ['git', 'submodules'] });
    },
    onError: (err: Error) => {
      toast.error('Remove failed', err.message);
    },
  });

  const statusColor = {
    'up-to-date': 'bg-success',
    modified: 'bg-warning',
    uninitialized: 'bg-tertiary',
    dirty: 'bg-danger',
  }[submodule.status];

  const statusLabel = {
    'up-to-date': 'Up to date',
    modified: 'Modified',
    uninitialized: 'Not initialized',
    dirty: 'Dirty',
  }[submodule.status];

  const contextItems = [
    {
      label: 'Update',
      icon: <Download className="w-4 h-4" />,
      onClick: () => updateMutation.mutate(),
    },
    {
      label: 'Sync URL',
      icon: <Link2 className="w-4 h-4" />,
      onClick: () =>
        gitApi.syncSubmodules(repoPath, [submodule.path]).then(() => {
          toast.info('URL synced', submodule.path);
        }),
    },
    { separator: true, label: '' },
    {
      label: 'Open URL',
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: () => {
        if (submodule.url) {
          window.api.invoke('shell:open-external', {
            url: submodule.url.replace(/\.git$/, ''),
          });
        }
      },
      disabled: !submodule.url,
    },
    { separator: true, label: '' },
    {
      label: 'Remove Submodule',
      icon: <Trash2 className="w-4 h-4" />,
      danger: true,
      onClick: () => removeMutation.mutate(),
    },
  ];

  return (
    <ContextMenu items={contextItems}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.05 }}
        className="mb-1.5 rounded-lg border border-default overflow-hidden"
      >
        {/* Main row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-secondary hover:bg-hover transition-colors text-left"
        >
          {/* Status indicator */}
          <div className="relative">
            <Package className="w-5 h-5 text-accent" />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-[var(--color-bg-secondary)]`}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary truncate">
                {submodule.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  submodule.status === 'up-to-date'
                    ? 'bg-success-muted text-success'
                    : submodule.status === 'modified'
                      ? 'bg-warning-muted text-warning'
                      : submodule.status === 'dirty'
                        ? 'bg-danger-muted text-danger'
                        : 'bg-tertiary text-tertiary'
                }`}
              >
                {statusLabel}
              </span>
              {submodule.dirty && submodule.status !== 'dirty' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-muted text-danger font-medium">
                  dirty
                </span>
              )}
            </div>
            <div className="text-xs text-tertiary font-mono truncate mt-0.5">
              {submodule.path}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateMutation.mutate();
              }}
              disabled={updateMutation.isPending}
              className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-active transition-colors"
              title="Update submodule"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
            <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
              <ChevronRight className="w-4 h-4 text-tertiary" />
            </motion.div>
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 bg-primary border-t border-default space-y-2.5">
                {/* URL */}
                <div className="flex items-center gap-2 text-xs">
                  <Globe className="w-3 h-3 text-tertiary flex-shrink-0" />
                  <span className="text-secondary">URL:</span>
                  <span className="font-mono text-primary truncate flex-1">
                    {submodule.url || 'N/A'}
                  </span>
                  {submodule.url && (
                    <button
                      onClick={() =>
                        window.api.invoke('shell:open-external', {
                          url: submodule.url.replace(/\.git$/, ''),
                        })
                      }
                      className="p-1 rounded hover:bg-hover text-tertiary hover:text-accent transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Commit hash */}
                <div className="flex items-center gap-2 text-xs">
                  <Hash className="w-3 h-3 text-tertiary flex-shrink-0" />
                  <span className="text-secondary">Commit:</span>
                  <span className="font-mono text-accent">
                    {submodule.currentHash.slice(0, 10)}
                  </span>
                </div>

                {/* Branch */}
                {submodule.branch && (
                  <div className="flex items-center gap-2 text-xs">
                    <GitBranch className="w-3 h-3 text-tertiary flex-shrink-0" />
                    <span className="text-secondary">Branch:</span>
                    <span className="text-primary">{submodule.branch}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-muted text-accent text-xs font-medium hover:bg-accent hover:text-[var(--color-text-inverse)] transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" />
                    Update
                  </button>
                  <button
                    onClick={() =>
                      gitApi
                        .syncSubmodules(repoPath, [submodule.path])
                        .then(() => toast.info('Synced', submodule.path))
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-tertiary text-secondary text-xs font-medium hover:bg-hover transition-colors"
                  >
                    <Link2 className="w-3 h-3" />
                    Sync
                  </button>
                  <button
                    onClick={() => removeMutation.mutate()}
                    disabled={removeMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-danger-muted text-danger text-xs font-medium hover:bg-danger hover:text-white transition-colors disabled:opacity-50 ml-auto"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </ContextMenu>
  );
}

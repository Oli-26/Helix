import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch, GitMerge, Plus, Trash2, Check, Globe, Search,
  Copy, RotateCcw, ArrowUp, ArrowDown, Clock, Loader2,
  GitBranchPlus, ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useBranches } from '../../hooks/useBranches';
import { useRepository } from '../../hooks/useRepository';
import { useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { BranchInfo } from '../../../shared/git-types';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

export function BranchList() {
  const repoPath = useRepoPath();
  const { data: branches, isLoading } = useBranches(repoPath);
  const { data: repo } = useRepository(repoPath);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [expandRemote, setExpandRemote] = useState(true);

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

  const currentBranch = repo?.currentBranch;

  const checkoutMutation = useMutation({
    mutationFn: (branch: string) => gitApi.checkout(repoPath!, branch),
    onSuccess: (_d, branch) => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Checked out', branch);
    },
    onError: (err: any) => toast.error('Checkout failed', err.message),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => gitApi.createBranch(repoPath!, name),
    onSuccess: (_d, name) => {
      setNewBranchName('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Branch created', name);
    },
    onError: (err: any) => toast.error('Create failed', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ name, force }: { name: string; force?: boolean }) =>
      gitApi.deleteBranch(repoPath!, name, force),
    onSuccess: (_d, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Branch deleted', name);
    },
    onError: (err: any) => toast.error('Delete failed', err.message),
  });

  const mergeMutation = useMutation({
    mutationFn: (branch: string) => gitApi.merge(repoPath!, branch),
    onSuccess: (_d, branch) => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Merged', `${branch} into ${currentBranch}`);
    },
    onError: (err: any) => toast.error('Merge failed', err.message),
  });

  const rebaseMutation = useMutation({
    mutationFn: (onto: string) => gitApi.rebase(repoPath!, onto),
    onSuccess: (_d, onto) => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Rebased', `onto ${onto}`);
    },
    onError: (err: any) => toast.error('Rebase failed', err.message),
  });

  // Close context menu on outside click / escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => { window.removeEventListener('click', handleClick); window.removeEventListener('keydown', handleEscape); };
  }, [contextMenu]);

  const handleBranchContextMenu = useCallback(
    (e: React.MouseEvent, branch: BranchInfo) => {
      e.preventDefault();
      e.stopPropagation();

      const isCurrent = branch.current;
      const items: ContextMenuItem[] = [
        {
          label: 'Checkout',
          icon: <Check className="w-3.5 h-3.5" />,
          disabled: isCurrent,
          onClick: () => checkoutMutation.mutate(branch.name),
        },
        { separator: true, label: '' },
        {
          label: `Merge into ${currentBranch || 'current'}`,
          icon: <GitMerge className="w-3.5 h-3.5" />,
          disabled: isCurrent,
          onClick: () => {
            setConfirmModal({
              open: true,
              title: 'Merge Branch',
              message: `Merge "${branch.name}" into "${currentBranch}"?`,
              confirmLabel: 'Merge',
              onConfirm: () => { mergeMutation.mutate(branch.name); closeModal(); },
            });
          },
        },
        {
          label: `Rebase ${currentBranch || 'current'} onto this`,
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          disabled: isCurrent,
          onClick: () => {
            setConfirmModal({
              open: true,
              title: 'Rebase Branch',
              message: `Rebase "${currentBranch}" onto "${branch.name}"? This rewrites commit history.`,
              danger: true,
              confirmLabel: 'Rebase',
              onConfirm: () => { rebaseMutation.mutate(branch.name); closeModal(); },
            });
          },
        },
        { separator: true, label: '' },
        {
          label: 'Copy Branch Name',
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            navigator.clipboard.writeText(branch.name);
            toast.info('Copied', branch.name);
          },
        },
        { separator: true, label: '' },
        {
          label: 'Delete Branch',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          disabled: isCurrent,
          onClick: () => {
            setConfirmModal({
              open: true,
              title: 'Delete Branch',
              message: `Delete branch "${branch.name}"? This cannot be undone.`,
              danger: true,
              confirmLabel: 'Delete',
              onConfirm: () => { deleteMutation.mutate({ name: branch.name }); closeModal(); },
            });
          },
        },
      ];

      const x = Math.min(e.clientX, window.innerWidth - 260);
      const y = Math.min(e.clientY, window.innerHeight - items.filter((i) => !i.separator).length * 36 - 16);
      setContextMenu({ x, y, items });
    },
    [currentBranch, checkoutMutation, mergeMutation, rebaseMutation, deleteMutation],
  );

  const handleRemoteContextMenu = useCallback(
    (e: React.MouseEvent, branch: BranchInfo) => {
      e.preventDefault();
      e.stopPropagation();

      const shortName = branch.name.replace(/^remotes\/[^/]+\//, '');
      const items: ContextMenuItem[] = [
        {
          label: `Checkout as local "${shortName}"`,
          icon: <GitBranchPlus className="w-3.5 h-3.5" />,
          onClick: () => checkoutMutation.mutate(shortName),
        },
        { separator: true, label: '' },
        {
          label: 'Copy Branch Name',
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            navigator.clipboard.writeText(branch.name);
            toast.info('Copied', branch.name);
          },
        },
      ];

      const x = Math.min(e.clientX, window.innerWidth - 260);
      const y = Math.min(e.clientY, window.innerHeight - 100);
      setContextMenu({ x, y, items });
    },
    [checkoutMutation],
  );

  const filteredLocal =
    branches?.local.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const filteredRemote =
    branches?.remote.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading branches...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-default flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter branches..."
            className="w-full bg-input border border-default rounded-lg pl-9 pr-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* Create branch input */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-default"
          >
            <div className="flex gap-2 p-4">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Branch name..."
                className="flex-1 bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBranchName.trim()) {
                    createMutation.mutate(newBranchName.trim());
                  }
                  if (e.key === 'Escape') setShowCreate(false);
                }}
              />
              <button
                onClick={() => createMutation.mutate(newBranchName.trim())}
                disabled={!newBranchName.trim() || createMutation.isPending}
                className="px-4 py-2 bg-success text-text-inverse rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranchPlus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branch lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Local branches */}
        <div className="p-2">
          <h3 className="px-2 py-1.5 text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-3 h-3" />
            Local ({filteredLocal.length})
          </h3>
          <AnimatePresence>
            {filteredLocal.map((branch) => (
              <motion.div
                key={branch.name}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onContextMenu={(e) => handleBranchContextMenu(e, branch)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm group transition-colors cursor-pointer
                  ${branch.current ? 'bg-accent-muted' : 'hover:bg-hover'}
                `}
                onClick={() => {
                  if (!branch.current) checkoutMutation.mutate(branch.name);
                }}
              >
                {branch.current ? (
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                ) : (
                  <GitBranch className="w-4 h-4 text-secondary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span
                    className={`block truncate ${branch.current ? 'text-accent font-medium' : 'text-primary'}`}
                  >
                    {branch.name}
                  </span>
                  {/* Tracking info & last commit */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {branch.tracking && (
                      <span className="text-[10px] text-tertiary font-mono truncate">{branch.tracking}</span>
                    )}
                    {(branch.ahead != null && branch.ahead > 0) && (
                      <span className="flex items-center gap-0.5 text-[10px] text-success">
                        <ArrowUp className="w-2.5 h-2.5" />{branch.ahead}
                      </span>
                    )}
                    {(branch.behind != null && branch.behind > 0) && (
                      <span className="flex items-center gap-0.5 text-[10px] text-danger">
                        <ArrowDown className="w-2.5 h-2.5" />{branch.behind}
                      </span>
                    )}
                    {branch.lastCommitDate && (
                      <span className="flex items-center gap-0.5 text-[10px] text-tertiary">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(branch.lastCommitDate * 1000), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                {!branch.current && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); mergeMutation.mutate(branch.name); }}
                      className="p-1.5 rounded text-secondary hover:text-primary hover:bg-tertiary transition-colors"
                      title={`Merge into ${currentBranch}`}
                    >
                      <GitMerge className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          open: true, title: 'Delete Branch',
                          message: `Delete branch "${branch.name}"?`,
                          danger: true, confirmLabel: 'Delete',
                          onConfirm: () => { deleteMutation.mutate({ name: branch.name }); closeModal(); },
                        });
                      }}
                      className="p-1.5 rounded text-secondary hover:text-danger hover:bg-danger-muted transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredLocal.length === 0 && search && (
            <div className="px-3 py-4 text-sm text-tertiary text-center">
              No branches matching "{search}"
            </div>
          )}
        </div>

        {/* Remote branches */}
        <div className="p-2 border-t border-subtle">
          <button
            onClick={() => setExpandRemote(!expandRemote)}
            className="w-full px-2 py-1.5 text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-2 hover:text-primary transition-colors"
          >
            <motion.div animate={{ rotate: expandRemote ? 90 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronRight className="w-3 h-3" />
            </motion.div>
            <Globe className="w-3 h-3" />
            Remote ({filteredRemote.length})
          </button>
          <AnimatePresence>
            {expandRemote && filteredRemote.map((branch) => (
              <motion.div
                key={branch.name}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onContextMenu={(e) => handleRemoteContextMenu(e, branch)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-hover transition-colors cursor-pointer group"
                onClick={() => {
                  const shortName = branch.name.replace(/^remotes\/[^/]+\//, '');
                  checkoutMutation.mutate(shortName);
                }}
              >
                <Globe className="w-4 h-4 text-tertiary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-secondary">{branch.name}</span>
                  {branch.lastCommitDate && (
                    <span className="flex items-center gap-0.5 text-[10px] text-tertiary mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDistanceToNow(new Date(branch.lastCommitDate * 1000), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                  checkout
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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
              if (item.separator) return <div key={`sep-${index}`} className="h-px bg-[var(--color-border)] my-1 mx-2" />;
              return (
                <button
                  key={item.label}
                  onClick={() => { if (!item.disabled) { item.onClick?.(); setContextMenu(null); } }}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 text-[13px] transition-colors text-left ${
                    item.disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
                  } ${item.danger ? 'text-danger hover:bg-danger-muted' : 'text-primary hover:bg-hover'}`}
                >
                  {item.icon && <span className="w-4 h-4 flex items-center justify-center text-secondary flex-shrink-0">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}

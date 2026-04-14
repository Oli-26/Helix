import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Download, RefreshCw, Globe, ChevronRight,
  AlertTriangle, Check, X, Loader2, Copy, Plus, Trash2,
  Edit3, Save,
} from 'lucide-react';
import { useRepoPath } from '../../stores/ui-store';
import { useRepository } from '../../hooks/useRepository';
import { gitApi } from '../../api/git';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export function RemotePanel() {
  const repoPath = useRepoPath();
  const { data: repo } = useRepository(repoPath);
  const queryClient = useQueryClient();
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');

  const remotesQuery = useQuery({
    queryKey: ['git', 'remotes', repoPath],
    queryFn: () => gitApi.getRemotes(repoPath!),
    enabled: !!repoPath,
  });

  const addRemoteMutation = useMutation({
    mutationFn: () => gitApi.addRemote(repoPath!, newRemoteName.trim(), newRemoteUrl.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git', 'remotes'] });
      setNewRemoteName('');
      setNewRemoteUrl('');
      setShowAddRemote(false);
      toast.success('Remote added', newRemoteName.trim());
    },
    onError: (err: any) => toast.error('Add remote failed', err.message),
  });

  return (
    <div className="h-full flex flex-col bg-primary overflow-y-auto">
      {/* Quick actions */}
      <div className="p-4 border-b border-default">
        <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <RemoteActionButton
            icon={<Upload className="w-4 h-4" />}
            label="Push"
            repoPath={repoPath}
            action="push"
          />
          <RemoteActionButton
            icon={<Download className="w-4 h-4" />}
            label="Pull"
            repoPath={repoPath}
            action="pull"
          />
          <RemoteActionButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="Fetch"
            repoPath={repoPath}
            action="fetch"
          />
        </div>
      </div>

      {/* Push dialog */}
      <PushSection repoPath={repoPath} currentBranch={repo?.currentBranch} />

      {/* Pull dialog */}
      <PullSection repoPath={repoPath} />

      {/* Remotes list */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent" />
            Remotes
          </h2>
          <button
            onClick={() => setShowAddRemote(!showAddRemote)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent-muted rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Add remote form */}
        <AnimatePresence>
          {showAddRemote && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="p-3 rounded-lg border border-default bg-secondary space-y-2">
                <input
                  type="text"
                  value={newRemoteName}
                  onChange={(e) => setNewRemoteName(e.target.value)}
                  placeholder="Remote name (e.g. upstream)"
                  className="w-full bg-input border border-default rounded px-3 py-1.5 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors"
                  autoFocus
                />
                <input
                  type="text"
                  value={newRemoteUrl}
                  onChange={(e) => setNewRemoteUrl(e.target.value)}
                  placeholder="Remote URL"
                  className="w-full bg-input border border-default rounded px-3 py-1.5 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newRemoteName.trim() && newRemoteUrl.trim()) {
                      addRemoteMutation.mutate();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addRemoteMutation.mutate()}
                    disabled={!newRemoteName.trim() || !newRemoteUrl.trim() || addRemoteMutation.isPending}
                    className="flex-1 py-1.5 bg-accent text-text-inverse rounded text-xs font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {addRemoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add Remote
                  </button>
                  <button
                    onClick={() => { setShowAddRemote(false); setNewRemoteName(''); setNewRemoteUrl(''); }}
                    className="px-3 py-1.5 bg-tertiary text-secondary rounded text-xs hover:bg-hover transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {remotesQuery.data?.map((remote) => (
          <RemoteItem
            key={remote.name}
            name={remote.name}
            url={remote.fetchUrl}
            repoPath={repoPath!}
          />
        ))}
        {(!remotesQuery.data || remotesQuery.data.length === 0) && (
          <div className="text-sm text-tertiary text-center py-4">
            No remotes configured
          </div>
        )}
      </div>
    </div>
  );
}

function RemoteItem({
  name,
  url,
  repoPath,
}: {
  name: string;
  url: string;
  repoPath: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(url);
  const [showConfirm, setShowConfirm] = useState(false);

  const removeMutation = useMutation({
    mutationFn: () => gitApi.removeRemote(repoPath, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git', 'remotes'] });
      toast.success('Remote removed', name);
    },
    onError: (err: any) => toast.error('Remove failed', err.message),
  });

  const updateUrlMutation = useMutation({
    mutationFn: () => gitApi.setRemoteUrl(repoPath, name, editUrl.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git', 'remotes'] });
      setEditing(false);
      toast.success('URL updated', name);
    },
    onError: (err: any) => toast.error('Update failed', err.message),
  });

  return (
    <div className="px-3 py-2.5 rounded-lg bg-secondary mb-2 group hover:border-default border border-transparent transition-colors">
      <div className="flex items-center gap-3">
        <Globe className="w-4 h-4 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-primary">{name}</div>
          {editing ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="flex-1 bg-input border border-default rounded px-2 py-0.5 text-xs font-mono text-primary focus:outline-none focus:border-accent transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateUrlMutation.mutate();
                  if (e.key === 'Escape') { setEditing(false); setEditUrl(url); }
                }}
              />
              <button
                onClick={() => updateUrlMutation.mutate()}
                disabled={updateUrlMutation.isPending}
                className="p-1 rounded text-success hover:bg-success-muted transition-colors"
                title="Save"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setEditing(false); setEditUrl(url); }}
                className="p-1 rounded text-tertiary hover:text-primary hover:bg-tertiary transition-colors"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-tertiary truncate font-mono">{url}</div>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => { navigator.clipboard.writeText(url); toast.info('Copied URL'); }}
              className="p-1.5 rounded text-tertiary hover:text-primary hover:bg-tertiary transition-colors"
              title="Copy URL"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded text-tertiary hover:text-primary hover:bg-tertiary transition-colors"
              title="Edit URL"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1.5 rounded text-tertiary hover:text-danger hover:bg-danger-muted transition-colors"
              title="Remove remote"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <ConfirmModal
        open={showConfirm}
        title="Remove Remote"
        message={`Remove remote "${name}"? This won't delete the remote repository, just the local reference.`}
        danger
        confirmLabel="Remove"
        onConfirm={() => { removeMutation.mutate(); setShowConfirm(false); }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

function RemoteActionButton({
  icon,
  label,
  repoPath,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  repoPath: string | null;
  action: 'push' | 'pull' | 'fetch';
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (!repoPath) return;
    setStatus('loading');
    try {
      if (action === 'push') await gitApi.push(repoPath);
      else if (action === 'pull') await gitApi.pull(repoPath);
      else await gitApi.fetch(repoPath);
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success(`${label} successful`);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      setStatus('error');
      toast.error(`${label} failed`, err?.message || 'Unknown error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!repoPath || status === 'loading'}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
        status === 'success'
          ? 'border-success/30 bg-success-muted'
          : status === 'error'
            ? 'border-danger/30 bg-danger-muted'
            : 'border-default bg-secondary hover:bg-tertiary hover:border-default'
      } disabled:opacity-50`}
    >
      {status === 'loading' ? (
        <Loader2 className="w-4 h-4 text-accent animate-spin" />
      ) : status === 'success' ? (
        <Check className="w-4 h-4 text-success" />
      ) : status === 'error' ? (
        <X className="w-4 h-4 text-danger" />
      ) : (
        <span className="text-accent">{icon}</span>
      )}
      <span className="text-xs text-secondary">{label}</span>
    </button>
  );
}

function PushSection({
  repoPath,
  currentBranch,
}: {
  repoPath: string | null;
  currentBranch?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [forcePush, setForcePush] = useState(false);
  const queryClient = useQueryClient();

  // Confirm modal for force push
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  const pushMutation = useMutation({
    mutationFn: () =>
      gitApi.push(repoPath!, 'origin', currentBranch, forcePush),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      setExpanded(false);
      toast.success('Push successful', `${currentBranch} → origin`);
    },
    onError: (err: any) => toast.error('Push failed', err.message),
  });

  const handlePush = () => {
    if (forcePush) {
      setShowForceConfirm(true);
    } else {
      pushMutation.mutate();
    }
  };

  return (
    <div className="border-b border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-hover transition-colors"
      >
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight className="w-4 h-4 text-tertiary" />
        </motion.div>
        <Upload className="w-4 h-4 text-accent" />
        <span className="text-primary font-medium">Push Options</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="text-xs text-secondary">
                Push{' '}
                <span className="font-mono text-accent">
                  {currentBranch || 'HEAD'}
                </span>{' '}
                to origin
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={forcePush}
                  onChange={(e) => setForcePush(e.target.checked)}
                  className="rounded accent-[var(--color-accent)]"
                />
                <span className="text-secondary">Force push</span>
                {forcePush && (
                  <span className="flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="w-3 h-3" />
                    Overwrites remote history
                  </span>
                )}
              </label>
              <button
                onClick={handlePush}
                disabled={!repoPath || pushMutation.isPending}
                className={`w-full py-2 text-text-inverse rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
                  forcePush ? 'bg-warning hover:opacity-90' : 'bg-accent hover:bg-accent-hover'
                }`}
              >
                {pushMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {pushMutation.isPending ? 'Pushing...' : forcePush ? 'Force Push' : 'Push'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={showForceConfirm}
        title="Force Push"
        message={`Force push "${currentBranch}" to origin? This will overwrite the remote branch history and may cause issues for other collaborators.`}
        danger
        confirmLabel="Force Push"
        onConfirm={() => { pushMutation.mutate(); setShowForceConfirm(false); }}
        onCancel={() => setShowForceConfirm(false)}
      />
    </div>
  );
}

function PullSection({ repoPath }: { repoPath: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [rebase, setRebase] = useState(false);
  const queryClient = useQueryClient();

  const pullMutation = useMutation({
    mutationFn: () => gitApi.pull(repoPath!, undefined, rebase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      setExpanded(false);
      toast.success('Pull successful', rebase ? 'Rebased' : 'Merged');
    },
    onError: (err: any) => toast.error('Pull failed', err.message),
  });

  return (
    <div className="border-b border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-hover transition-colors"
      >
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight className="w-4 h-4 text-tertiary" />
        </motion.div>
        <Download className="w-4 h-4 text-success" />
        <span className="text-primary font-medium">Pull Options</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={rebase}
                  onChange={(e) => setRebase(e.target.checked)}
                  className="rounded accent-[var(--color-accent)]"
                />
                <span className="text-secondary">Rebase instead of merge</span>
              </label>
              <button
                onClick={() => pullMutation.mutate()}
                disabled={!repoPath || pullMutation.isPending}
                className="w-full py-2 bg-success text-text-inverse rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {pullMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {pullMutation.isPending ? 'Pulling...' : 'Pull'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Download, RefreshCw, Globe, ChevronRight,
  AlertTriangle, Check, X, Loader2, Copy, ExternalLink,
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

  const remotesQuery = useQuery({
    queryKey: ['git', 'remotes', repoPath],
    queryFn: () => gitApi.getRemotes(repoPath!),
    enabled: !!repoPath,
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
        <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" />
          Remotes
        </h2>
        {remotesQuery.data?.map((remote) => (
          <div
            key={remote.name}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary mb-2 group hover:border-default border border-transparent transition-colors"
          >
            <Globe className="w-4 h-4 text-accent flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary">
                {remote.name}
              </div>
              <div className="text-xs text-tertiary truncate font-mono">
                {remote.fetchUrl}
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(remote.fetchUrl);
                toast.info('Copied URL');
              }}
              className="p-1.5 rounded text-tertiary hover:text-primary hover:bg-tertiary transition-colors opacity-0 group-hover:opacity-100"
              title="Copy URL"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
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

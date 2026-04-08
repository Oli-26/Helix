import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Download,
  RefreshCw,
  Globe,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';
import { useRepository } from '../../hooks/useRepository';
import { gitApi } from '../../api/git';

export function RemotePanel() {
  const repoPath = useUIStore((s) => s.repoPath);
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
        <h2 className="text-sm font-semibold text-primary mb-3">
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
          <Globe className="w-4 h-4" />
          Remotes
        </h2>
        {remotesQuery.data?.map((remote) => (
          <div
            key={remote.name}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary mb-2"
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
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!repoPath || status === 'loading'}
      className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-default bg-secondary hover:bg-tertiary disabled:opacity-50 transition-colors"
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

  const pushMutation = useMutation({
    mutationFn: () =>
      gitApi.push(repoPath!, 'origin', currentBranch, forcePush),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git'] });
      setExpanded(false);
    },
  });

  return (
    <div className="border-b border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-hover transition-colors"
      >
        <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={forcePush}
                  onChange={(e) => setForcePush(e.target.checked)}
                  className="rounded"
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
                onClick={() => pushMutation.mutate()}
                disabled={!repoPath || pushMutation.isPending}
                className="w-full py-2 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {pushMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {pushMutation.isPending ? 'Pushing...' : 'Push'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    },
  });

  return (
    <div className="border-b border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-hover transition-colors"
      >
        <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rebase}
                  onChange={(e) => setRebase(e.target.checked)}
                  className="rounded"
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

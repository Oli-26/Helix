import { useEffect, useState, useRef, useCallback } from 'react';
import {
  GitBranch, ArrowUp, ArrowDown, RefreshCw, FileEdit,
  Check, AlertTriangle, Clock, Loader2,
} from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';
import { useStatus } from '../../hooks/useStatus';
import { useBranches } from '../../hooks/useBranches';
import { useUIStore, useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { toast } from '../ui/Toast';

export function StatusBar() {
  const repoPath = useRepoPath();
  const setView = useUIStore((s) => s.setView);
  const { data: repo } = useRepository(repoPath);
  const { data: files } = useStatus(repoPath);
  const { data: branches } = useBranches(repoPath);
  const queryClient = useQueryClient();
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [fetching, setFetching] = useState(false);
  const autoFetchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentBranch = branches?.local.find((b) => b.current);
  const changedFiles = files?.length || 0;
  const stagedFiles = files?.filter((f) => f.isStaged).length || 0;
  const unstagedFiles = changedFiles - stagedFiles;

  // Auto-fetch every 5 minutes
  const doFetch = useCallback(async () => {
    if (!repoPath || fetching) return;
    setFetching(true);
    try {
      await gitApi.fetch(repoPath);
      setLastFetch(new Date());
      queryClient.invalidateQueries({ queryKey: ['git'] });
    } catch (err: any) {
      toast.error('Fetch failed', err?.message || 'Check your network connection');
    } finally {
      setFetching(false);
    }
  }, [repoPath, fetching, queryClient]);

  useEffect(() => {
    if (!repoPath) return;
    autoFetchRef.current = setInterval(() => {
      doFetch();
    }, 5 * 60 * 1000);
    return () => {
      if (autoFetchRef.current) clearInterval(autoFetchRef.current);
    };
  }, [repoPath, doFetch]);

  const stateConfig: Record<string, { label: string; color: string; view?: 'conflicts' }> = {
    clean: { label: '', color: '' },
    merging: { label: 'MERGING', color: 'text-warning', view: 'conflicts' },
    rebasing: { label: 'REBASING', color: 'text-warning', view: 'conflicts' },
    'cherry-picking': { label: 'CHERRY-PICK', color: 'text-warning', view: 'conflicts' },
    reverting: { label: 'REVERTING', color: 'text-warning' },
    bisecting: { label: 'BISECTING', color: 'text-accent' },
  };

  const handleFetch = () => doFetch();

  const formatLastFetch = () => {
    if (!lastFetch) return 'Never';
    const diff = Date.now() - lastFetch.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  if (!repoPath) return null;

  const state = stateConfig[repo?.state || 'clean'];

  return (
    <div className="flex items-center justify-between h-7 px-3 bg-secondary border-t border-default text-[11px] select-none flex-shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Branch */}
        <button
          onClick={() => setView('branches')}
          className="flex items-center gap-1.5 text-secondary hover:text-primary transition-colors"
          title={`Current branch: ${repo?.currentBranch || 'HEAD'}. Click to switch branches.`}
        >
          <GitBranch className="w-3 h-3 text-accent" />
          <span className="font-medium max-w-[160px] truncate">{repo?.currentBranch || 'HEAD'}</span>
        </button>

        {/* Ahead/Behind */}
        {currentBranch && (currentBranch.ahead || currentBranch.behind) && (
          <button
            onClick={() => setView('remotes')}
            className="flex items-center gap-1.5 text-tertiary hover:text-primary transition-colors"
            title={`${currentBranch.ahead || 0} ahead, ${currentBranch.behind || 0} behind remote. Click to push/pull.`}
          >
            {currentBranch.ahead ? (
              <span className="flex items-center gap-0.5 text-success">
                <ArrowUp className="w-3 h-3" />
                {currentBranch.ahead}
              </span>
            ) : null}
            {currentBranch.behind ? (
              <span className="flex items-center gap-0.5 text-danger">
                <ArrowDown className="w-3 h-3" />
                {currentBranch.behind}
              </span>
            ) : null}
          </button>
        )}

        {/* Repo state */}
        {state.label && (
          <button
            onClick={() => state.view && setView(state.view)}
            className={`font-bold ${state.color} flex items-center gap-1 ${state.view ? 'hover:opacity-80 cursor-pointer' : ''} transition-opacity`}
            title={state.view ? `Click to view ${state.label.toLowerCase()} state` : state.label}
          >
            <AlertTriangle className="w-3 h-3" />
            {state.label}
          </button>
        )}

        {/* Sync button */}
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="flex items-center gap-1 text-tertiary hover:text-primary disabled:opacity-50 transition-colors"
          title={`Fetch all remotes${lastFetch ? ` (last: ${lastFetch.toLocaleTimeString()})` : ''}`}
        >
          <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin text-accent' : ''}`} />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Changed files */}
        {changedFiles > 0 && (
          <button
            onClick={() => setView('staging')}
            className="flex items-center gap-1 text-secondary hover:text-primary transition-colors"
            title={`${unstagedFiles} unstaged, ${stagedFiles} staged changes. Click to open staging view.`}
          >
            <FileEdit className="w-3 h-3" />
            <AnimatedCounter value={changedFiles} /> changed
            {stagedFiles > 0 && (
              <span className="text-success ml-0.5">
                (<AnimatedCounter value={stagedFiles} /> staged)
              </span>
            )}
          </button>
        )}

        {changedFiles === 0 && (
          <span className="flex items-center gap-1 text-success" title="Working tree is clean">
            <Check className="w-3 h-3" />
            Clean
          </span>
        )}

        {/* Last fetch */}
        <button
          onClick={handleFetch}
          className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors"
          title={lastFetch ? `Last fetch: ${lastFetch.toLocaleString()}. Click to fetch now.` : 'Click to fetch all remotes'}
        >
          <Clock className="w-3 h-3" />
          {formatLastFetch()}
        </button>
      </div>
    </div>
  );
}

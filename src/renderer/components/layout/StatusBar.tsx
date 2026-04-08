import { useEffect, useState } from 'react';
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileEdit,
  Check,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';
import { useStatus } from '../../hooks/useStatus';
import { useBranches } from '../../hooks/useBranches';
import { useUIStore , useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatedCounter } from '../ui/AnimatedCounter';

export function StatusBar() {
  const repoPath = useRepoPath();
  const setView = useUIStore((s) => s.setView);
  const { data: repo } = useRepository(repoPath);
  const { data: files } = useStatus(repoPath);
  const { data: branches } = useBranches(repoPath);
  const queryClient = useQueryClient();
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [fetching, setFetching] = useState(false);

  const currentBranch = branches?.local.find((b) => b.current);
  const changedFiles = files?.length || 0;
  const stagedFiles = files?.filter((f) => f.isStaged).length || 0;

  const stateLabels: Record<string, { label: string; color: string }> = {
    clean: { label: '', color: '' },
    merging: { label: 'MERGING', color: 'text-warning' },
    rebasing: { label: 'REBASING', color: 'text-warning' },
    'cherry-picking': { label: 'CHERRY-PICK', color: 'text-warning' },
    reverting: { label: 'REVERTING', color: 'text-warning' },
    bisecting: { label: 'BISECTING', color: 'text-accent' },
  };

  const handleFetch = async () => {
    if (!repoPath || fetching) return;
    setFetching(true);
    try {
      await gitApi.fetch(repoPath);
      setLastFetch(new Date());
      queryClient.invalidateQueries({ queryKey: ['git'] });
    } finally {
      setFetching(false);
    }
  };

  const formatLastFetch = () => {
    if (!lastFetch) return 'Never';
    const diff = Date.now() - lastFetch.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  if (!repoPath) return null;

  const state = stateLabels[repo?.state || 'clean'];

  return (
    <div className="flex items-center justify-between h-6 px-3 bg-secondary border-t border-default text-[11px] select-none flex-shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Branch */}
        <button
          onClick={() => setView('branches')}
          className="flex items-center gap-1.5 text-secondary hover:text-primary transition-colors"
        >
          <GitBranch className="w-3 h-3 text-accent" />
          <span className="font-medium">{repo?.currentBranch || 'HEAD'}</span>
        </button>

        {/* Ahead/Behind */}
        {currentBranch && (currentBranch.ahead || currentBranch.behind) && (
          <div className="flex items-center gap-1.5 text-tertiary">
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
          </div>
        )}

        {/* Repo state */}
        {state.label && (
          <span className={`font-bold ${state.color} flex items-center gap-1`}>
            <AlertTriangle className="w-3 h-3" />
            {state.label}
          </span>
        )}

        {/* Sync button */}
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors"
          title="Fetch all remotes"
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
          >
            <FileEdit className="w-3 h-3" />
            <AnimatedCounter value={changedFiles} /> changed
            {stagedFiles > 0 && (
              <span className="text-success ml-1">
                (<AnimatedCounter value={stagedFiles} /> staged)
              </span>
            )}
          </button>
        )}

        {changedFiles === 0 && (
          <span className="flex items-center gap-1 text-success">
            <Check className="w-3 h-3" />
            Clean
          </span>
        )}

        {/* Last fetch */}
        <span className="flex items-center gap-1 text-tertiary">
          <Clock className="w-3 h-3" />
          {formatLastFetch()}
        </span>
      </div>
    </div>
  );
}

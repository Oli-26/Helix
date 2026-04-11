import { useQuery } from '@tanstack/react-query';
import { Loader2, Orbit } from 'lucide-react';
import { useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { ConstellationCanvas } from './ConstellationCanvas';
import { EmptyState } from '../../components/shared/EmptyState';

export function ConstellationView() {
  const repoPath = useRepoPath();

  const { data, isLoading } = useQuery({
    queryKey: ['git', 'file-constellation', repoPath],
    queryFn: () => gitApi.getFileConstellation(repoPath!, 1000),
    enabled: !!repoPath,
    staleTime: 120_000,
  });

  if (isLoading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#05080f] text-secondary gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-sm">Mapping the stars...</span>
        <span className="text-xs text-tertiary">Analyzing file co-change patterns</span>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <EmptyState
        illustration="commits"
        title="Not enough history"
        description="Need at least a few commits with multiple files to map constellations"
      />
    );
  }

  return <ConstellationCanvas data={data} />;
}

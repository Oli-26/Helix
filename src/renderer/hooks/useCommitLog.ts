import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git';

export function useCommitLog(repoPath: string | null, maxCount = 5000) {
  return useQuery({
    queryKey: ['git', 'log', repoPath, maxCount],
    queryFn: () => gitApi.getLog(repoPath!, maxCount),
    enabled: !!repoPath,
    staleTime: 10_000,
  });
}

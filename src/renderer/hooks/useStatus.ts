import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git';

export function useStatus(repoPath: string | null) {
  return useQuery({
    queryKey: ['git', 'status', repoPath],
    queryFn: () => gitApi.getStatus(repoPath!),
    enabled: !!repoPath,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

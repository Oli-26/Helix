import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git';

export function useBranches(repoPath: string | null) {
  return useQuery({
    queryKey: ['git', 'branches', repoPath],
    queryFn: () => gitApi.getBranches(repoPath!),
    enabled: !!repoPath,
    staleTime: 10_000,
  });
}

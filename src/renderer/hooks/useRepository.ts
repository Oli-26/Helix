import { useQuery } from '@tanstack/react-query';
import { gitApi } from '../api/git';

export function useRepository(repoPath: string | null) {
  return useQuery({
    queryKey: ['git', 'repo-info', repoPath],
    queryFn: () => gitApi.getRepoInfo(repoPath!),
    enabled: !!repoPath,
    staleTime: 5_000,
  });
}

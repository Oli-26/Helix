import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore , useRepoPath } from '../stores/ui-store';

export function useGitWatcher() {
  const queryClient = useQueryClient();
  const repoPath = useRepoPath();

  useEffect(() => {
    if (!repoPath) return;

    const unsubscribe = window.api.on(
      'git:changed',
      (data: unknown) => {
        const { type } = data as { type: string };

        switch (type) {
          case 'status':
            queryClient.invalidateQueries({
              queryKey: ['git', 'status'],
            });
            break;
          case 'branches':
            queryClient.invalidateQueries({
              queryKey: ['git', 'branches'],
            });
            queryClient.invalidateQueries({
              queryKey: ['git', 'log'],
            });
            break;
          case 'head':
            queryClient.invalidateQueries({
              queryKey: ['git', 'repo-info'],
            });
            queryClient.invalidateQueries({
              queryKey: ['git', 'log'],
            });
            queryClient.invalidateQueries({
              queryKey: ['git', 'status'],
            });
            break;
          case 'all':
          default:
            queryClient.invalidateQueries({ queryKey: ['git'] });
            break;
        }
      },
    );

    return unsubscribe;
  }, [repoPath, queryClient]);
}

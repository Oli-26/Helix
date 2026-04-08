import { watch, type FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';
import path from 'node:path';

let watcher: FSWatcher | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function startWatching(repoPath: string): void {
  stopWatching();

  const gitDir = path.join(repoPath, '.git');

  watcher = watch(
    [
      path.join(gitDir, 'HEAD'),
      path.join(gitDir, 'refs'),
      path.join(gitDir, 'index'),
      path.join(gitDir, 'MERGE_HEAD'),
      path.join(gitDir, 'REBASE_HEAD'),
      path.join(gitDir, 'CHERRY_PICK_HEAD'),
      repoPath, // watch working tree too
    ],
    {
      ignoreInitial: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/objects/**',
        '**/.git/logs/**',
      ],
      depth: 2,
    },
  );

  watcher.on('all', (_event, filePath) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length === 0) return;

      let changeType: 'status' | 'branches' | 'head' | 'stash' | 'all' =
        'status';

      if (filePath.includes('refs')) {
        changeType = 'branches';
      } else if (filePath.endsWith('HEAD')) {
        changeType = 'head';
      } else if (filePath.includes('refs/stash')) {
        changeType = 'stash';
      } else if (
        filePath.includes('MERGE_HEAD') ||
        filePath.includes('REBASE_HEAD')
      ) {
        changeType = 'all';
      }

      for (const win of windows) {
        win.webContents.send('git:changed', { type: changeType });
      }
    }, 300);
  });
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

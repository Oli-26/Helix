import { ipcMain } from 'electron';
import Store from 'electron-store';

interface AppStore {
  recentRepos: string[];
  settings: Record<string, unknown>;
}

const store = new Store<AppStore>({
  defaults: {
    recentRepos: [],
    settings: {
      theme: 'dark',
      fontSize: 14,
      showLineNumbers: true,
    },
  },
});

export function registerAppHandlers(): void {
  ipcMain.handle('app:get-recent-repos', () => {
    return store.get('recentRepos', []);
  });

  ipcMain.handle('app:add-recent-repo', (_e, args) => {
    const repos = store.get('recentRepos', []) as string[];
    const filtered = repos.filter((r) => r !== args.path);
    filtered.unshift(args.path);
    store.set('recentRepos', filtered.slice(0, 20));
  });

  ipcMain.handle('app:get-settings', () => {
    return store.get('settings', {});
  });

  ipcMain.handle('app:set-settings', (_e, args) => {
    store.set('settings', args.settings);
  });
}

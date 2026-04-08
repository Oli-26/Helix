export const appApi = {
  getRecentRepos: () => window.api.invoke('app:get-recent-repos'),
  addRecentRepo: (path: string) =>
    window.api.invoke('app:add-recent-repo', { path }),
  getSettings: () => window.api.invoke('app:get-settings'),
  setSettings: (settings: Record<string, unknown>) =>
    window.api.invoke('app:set-settings', { settings }),
};

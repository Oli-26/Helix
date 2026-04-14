export const gitApi = {
  // Repository
  getRepoInfo: (repoPath: string) =>
    window.api.invoke('git:repo-info', { repoPath }),
  openRepo: () => window.api.invoke('git:open-repo'),
  pickDirectory: () => window.api.invoke('git:pick-directory'),
  clone: (url: string, directory: string) =>
    window.api.invoke('git:clone', { url, directory }),
  init: (directory: string) =>
    window.api.invoke('git:init', { directory }),

  // Log
  getLog: (repoPath: string, maxCount?: number, branch?: string) =>
    window.api.invoke('git:log', { repoPath, maxCount, branch }),
  getFilteredLog: (repoPath: string, options: { maxCount?: number; branch?: string; author?: string; since?: string; until?: string; searchText?: string }) =>
    window.api.invoke('git:log-filtered', { repoPath, ...options }),
  getCommitDetail: (repoPath: string, hash: string) =>
    window.api.invoke('git:commit-detail', { repoPath, hash }),

  // Status
  getStatus: (repoPath: string) =>
    window.api.invoke('git:status', { repoPath }),

  // Staging
  stage: (repoPath: string, files: string[]) =>
    window.api.invoke('git:stage', { repoPath, files }),
  unstage: (repoPath: string, files: string[]) =>
    window.api.invoke('git:unstage', { repoPath, files }),
  discardChanges: (repoPath: string, files: string[]) =>
    window.api.invoke('git:discard-changes', { repoPath, files }),
  stageLines: (repoPath: string, filePath: string, patch: string) =>
    window.api.invoke('git:stage-lines', { repoPath, filePath, patch }),
  unstageLines: (repoPath: string, filePath: string, patch: string) =>
    window.api.invoke('git:unstage-lines', { repoPath, filePath, patch }),

  // Commit
  commit: (repoPath: string, message: string, amend?: boolean) =>
    window.api.invoke('git:commit', { repoPath, message, amend }),

  // Diff
  getDiffForFile: (repoPath: string, filePath: string, staged?: boolean) =>
    window.api.invoke('git:diff-file', { repoPath, filePath, staged }),
  getDiffForFileWithOptions: (repoPath: string, filePath: string, staged?: boolean, options?: { ignoreWhitespace?: boolean; contextLines?: number }) =>
    window.api.invoke('git:diff-file-options', { repoPath, filePath, staged, ...options }),
  getDiffForCommit: (repoPath: string, hash: string) =>
    window.api.invoke('git:diff-commit', { repoPath, hash }),

  // Branches
  getBranches: (repoPath: string) =>
    window.api.invoke('git:branches', { repoPath }),
  checkout: (repoPath: string, branch: string) =>
    window.api.invoke('git:checkout', { repoPath, branch }),
  createBranch: (repoPath: string, name: string, startPoint?: string) =>
    window.api.invoke('git:create-branch', { repoPath, name, startPoint }),
  deleteBranch: (repoPath: string, name: string, force?: boolean) =>
    window.api.invoke('git:delete-branch', { repoPath, name, force }),
  merge: (repoPath: string, branch: string, noFf?: boolean) =>
    window.api.invoke('git:merge', { repoPath, branch, noFf }),
  rebase: (repoPath: string, onto: string) =>
    window.api.invoke('git:rebase', { repoPath, onto }),
  cherryPick: (repoPath: string, hash: string) =>
    window.api.invoke('git:cherry-pick', { repoPath, hash }),
  revertCommit: (repoPath: string, hash: string) =>
    window.api.invoke('git:revert', { repoPath, hash }),
  resetTo: (repoPath: string, hash: string, mode?: 'soft' | 'mixed' | 'hard') =>
    window.api.invoke('git:reset', { repoPath, hash, mode }),

  // Abort / Continue operations
  abortMerge: (repoPath: string) =>
    window.api.invoke('git:abort-merge', { repoPath }),
  abortRebase: (repoPath: string) =>
    window.api.invoke('git:abort-rebase', { repoPath }),
  abortCherryPick: (repoPath: string) =>
    window.api.invoke('git:abort-cherry-pick', { repoPath }),
  continueMerge: (repoPath: string) =>
    window.api.invoke('git:continue-merge', { repoPath }),
  continueRebase: (repoPath: string) =>
    window.api.invoke('git:continue-rebase', { repoPath }),
  continueCherryPick: (repoPath: string) =>
    window.api.invoke('git:continue-cherry-pick', { repoPath }),

  // Remotes
  getRemotes: (repoPath: string) =>
    window.api.invoke('git:remotes', { repoPath }),
  push: (repoPath: string, remote?: string, branch?: string, force?: boolean) =>
    window.api.invoke('git:push', { repoPath, remote, branch, force }),
  pull: (repoPath: string, remote?: string, rebase?: boolean) =>
    window.api.invoke('git:pull', { repoPath, remote, rebase }),
  fetch: (repoPath: string, remote?: string) =>
    window.api.invoke('git:fetch', { repoPath, remote }),
  addRemote: (repoPath: string, name: string, url: string) =>
    window.api.invoke('git:add-remote', { repoPath, name, url }),
  removeRemote: (repoPath: string, name: string) =>
    window.api.invoke('git:remove-remote', { repoPath, name }),
  renameRemote: (repoPath: string, oldName: string, newName: string) =>
    window.api.invoke('git:rename-remote', { repoPath, oldName, newName }),
  setRemoteUrl: (repoPath: string, name: string, url: string) =>
    window.api.invoke('git:set-remote-url', { repoPath, name, url }),

  // Stash
  getStashList: (repoPath: string) =>
    window.api.invoke('git:stash-list', { repoPath }),
  stashSave: (repoPath: string, message?: string) =>
    window.api.invoke('git:stash-save', { repoPath, message }),
  stashApply: (repoPath: string, index: number) =>
    window.api.invoke('git:stash-apply', { repoPath, index }),
  stashDrop: (repoPath: string, index: number) =>
    window.api.invoke('git:stash-drop', { repoPath, index }),
  stashPop: (repoPath: string, index: number) =>
    window.api.invoke('git:stash-pop', { repoPath, index }),
  getStashDiff: (repoPath: string, index: number) =>
    window.api.invoke('git:stash-diff', { repoPath, index }),

  // Blame
  getBlame: (repoPath: string, filePath: string) =>
    window.api.invoke('git:blame', { repoPath, filePath }),

  // Tags
  getTags: (repoPath: string) =>
    window.api.invoke('git:tags', { repoPath }),
  createTag: (repoPath: string, name: string, hash?: string, message?: string, annotated?: boolean) =>
    window.api.invoke('git:create-tag', { repoPath, name, hash, message, annotated }),
  deleteTag: (repoPath: string, name: string) =>
    window.api.invoke('git:delete-tag', { repoPath, name }),
  pushTag: (repoPath: string, name: string, remote?: string) =>
    window.api.invoke('git:push-tag', { repoPath, name, remote }),

  // Config
  getGitConfig: (repoPath: string) =>
    window.api.invoke('git:get-config', { repoPath }),
  setGitConfig: (repoPath: string, key: string, value: string, global?: boolean) =>
    window.api.invoke('git:set-config', { repoPath, key, value, global }),

  // File listing
  getTrackedFiles: (repoPath: string) =>
    window.api.invoke('git:ls-files', { repoPath }),

  // Stats
  getStats: (repoPath: string) =>
    window.api.invoke('git:stats', { repoPath }),
  getFileConstellation: (repoPath: string, maxCommits?: number) =>
    window.api.invoke('git:file-constellation', { repoPath, maxCommits }),

  // Search
  searchCommits: (repoPath: string, query: string) =>
    window.api.invoke('git:search-commits', { repoPath, query }),

  // Submodules
  getSubmodules: (repoPath: string) =>
    window.api.invoke('git:submodule-list', { repoPath }),
  addSubmodule: (repoPath: string, url: string, path?: string) =>
    window.api.invoke('git:submodule-add', { repoPath, url, path }),
  updateSubmodules: (repoPath: string, paths?: string[], init?: boolean, recursive?: boolean) =>
    window.api.invoke('git:submodule-update', { repoPath, paths, init, recursive }),
  syncSubmodules: (repoPath: string, paths?: string[]) =>
    window.api.invoke('git:submodule-sync', { repoPath, paths }),
  removeSubmodule: (repoPath: string, path: string) =>
    window.api.invoke('git:submodule-remove', { repoPath, path }),
};

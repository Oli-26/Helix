import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getGitService } from '../git/git-service';
import { GitSubmoduleService } from '../git/git-submodule-service';
import { startWatching } from '../git/git-watcher';
import simpleGit from 'simple-git';

export function registerGitHandlers(): void {
  // Repository
  ipcMain.handle('git:repo-info', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getRepoInfo();
  });

  ipcMain.handle('git:open-repo', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Git Repository',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const repoPath = result.filePaths[0];
    startWatching(repoPath);
    return repoPath;
  });

  ipcMain.handle('git:clone', async (_e, args) => {
    const git = simpleGit();
    await git.clone(args.url, args.directory);
    startWatching(args.directory);
    return args.directory;
  });

  ipcMain.handle('git:init', async (_e, args) => {
    const git = simpleGit(args.directory);
    await git.init();
    startWatching(args.directory);
    return args.directory;
  });

  // Log / History
  ipcMain.handle('git:log', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getLog(args.maxCount, args.branch);
  });

  ipcMain.handle('git:commit-detail', async (_e, args) => {
    const service = getGitService(args.repoPath);
    const [commit, files] = await Promise.all([
      service.getCommitByHash(args.hash),
      service.getDiffForCommit(args.hash),
    ]);
    return { commit, files };
  });

  // Status
  ipcMain.handle('git:status', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getStatus();
  });

  // Staging
  ipcMain.handle('git:stage', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.stage(args.files);
  });

  ipcMain.handle('git:unstage', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.unstage(args.files);
  });

  ipcMain.handle('git:discard-changes', async (_e, args) => {
    const service = getGitService(args.repoPath);
    const git = simpleGit(args.repoPath);
    await git.checkout(['--', ...args.files]);
  });

  // Commit
  ipcMain.handle('git:commit', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.commit(args.message, args.amend);
  });

  // Diff
  ipcMain.handle('git:diff-file', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getDiffForFile(args.filePath, args.staged);
  });

  ipcMain.handle('git:diff-commit', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getDiffForCommit(args.hash);
  });

  // Branches
  ipcMain.handle('git:branches', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getBranches();
  });

  ipcMain.handle('git:checkout', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.checkout(args.branch);
  });

  ipcMain.handle('git:create-branch', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.createBranch(args.name, args.startPoint);
  });

  ipcMain.handle('git:delete-branch', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.deleteBranch(args.name, args.force);
  });

  ipcMain.handle('git:merge', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.merge(args.branch, args.noFf);
  });

  ipcMain.handle('git:rebase', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.rebase(args.onto);
  });

  ipcMain.handle('git:cherry-pick', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.cherryPick(args.hash);
  });

  ipcMain.handle('git:revert', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.revertCommit(args.hash);
  });

  ipcMain.handle('git:reset', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.resetTo(args.hash, args.mode);
  });

  ipcMain.handle('git:stash-pop', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.stashPop(args.index);
  });

  // Remotes
  ipcMain.handle('git:remotes', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getRemotes();
  });

  ipcMain.handle('git:push', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.push(args.remote, args.branch, args.force);
  });

  ipcMain.handle('git:pull', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.pull(args.remote, args.rebase);
  });

  ipcMain.handle('git:fetch', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.fetch(args.remote);
  });

  // Stash
  ipcMain.handle('git:stash-list', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getStashList();
  });

  ipcMain.handle('git:stash-save', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.stashSave(args.message);
  });

  ipcMain.handle('git:stash-apply', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.stashApply(args.index);
  });

  ipcMain.handle('git:stash-drop', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.stashDrop(args.index);
  });

  // Tags
  ipcMain.handle('git:tags', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getTags();
  });

  ipcMain.handle('git:create-tag', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.createTag(args.name, args.hash, args.message, args.annotated);
  });

  ipcMain.handle('git:delete-tag', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.deleteTag(args.name);
  });

  ipcMain.handle('git:push-tag', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.pushTag(args.name, args.remote);
  });

  // Config
  ipcMain.handle('git:get-config', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getGitConfig();
  });

  ipcMain.handle('git:set-config', async (_e, args) => {
    const service = getGitService(args.repoPath);
    await service.setGitConfig(args.key, args.value, args.global);
  });

  // File listing
  ipcMain.handle('git:ls-files', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getTrackedFiles();
  });

  // Blame
  ipcMain.handle('git:blame', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getBlame(args.filePath);
  });

  // Stats
  ipcMain.handle('git:stats', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getStats();
  });

  ipcMain.handle('git:file-constellation', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.getFileConstellation(args.maxCommits);
  });

  // Search
  ipcMain.handle('git:search-commits', async (_e, args) => {
    const service = getGitService(args.repoPath);
    return service.searchCommits(args.query);
  });

  // Submodules
  ipcMain.handle('git:submodule-list', async (_e, args) => {
    const service = new GitSubmoduleService(args.repoPath);
    return service.list();
  });

  ipcMain.handle('git:submodule-add', async (_e, args) => {
    const service = new GitSubmoduleService(args.repoPath);
    await service.add(args.url, args.path);
  });

  ipcMain.handle('git:submodule-update', async (_e, args) => {
    const service = new GitSubmoduleService(args.repoPath);
    await service.update(args.paths, args.init, args.recursive);
  });

  ipcMain.handle('git:submodule-sync', async (_e, args) => {
    const service = new GitSubmoduleService(args.repoPath);
    await service.sync(args.paths);
  });

  ipcMain.handle('git:submodule-remove', async (_e, args) => {
    const service = new GitSubmoduleService(args.repoPath);
    await service.remove(args.path);
  });
}

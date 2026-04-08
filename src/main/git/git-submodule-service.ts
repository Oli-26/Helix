import simpleGit from 'simple-git';
import type { SubmoduleInfo, SubmoduleStatus } from '../../shared/submodule-types';

export class GitSubmoduleService {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  async list(): Promise<SubmoduleInfo[]> {
    const git = simpleGit(this.repoPath);

    // Get submodule status
    let raw: string;
    try {
      raw = await git.raw(['submodule', 'status', '--recursive']);
    } catch {
      return [];
    }

    if (!raw.trim()) return [];

    // Parse submodule config for URLs
    let configRaw = '';
    try {
      configRaw = await git.raw(['config', '--file', '.gitmodules', '--list']);
    } catch {
      // .gitmodules might not exist
    }

    const urlMap = new Map<string, string>();
    const branchMap = new Map<string, string>();
    for (const line of configRaw.split('\n').filter(Boolean)) {
      const urlMatch = line.match(/^submodule\.(.+)\.url=(.+)$/);
      if (urlMatch) urlMap.set(urlMatch[1], urlMatch[2]);
      const branchMatch = line.match(/^submodule\.(.+)\.branch=(.+)$/);
      if (branchMatch) branchMap.set(branchMatch[1], branchMatch[2]);
    }

    const submodules: SubmoduleInfo[] = [];

    for (const line of raw.split('\n').filter(Boolean)) {
      // Format: " <hash> <path> (<describe>)" or "+<hash> <path> (<describe>)" or "-<hash> <path>"
      const match = line.match(/^([ +\-U])([0-9a-f]+) (.+?)(?:\s+\((.+)\))?$/);
      if (!match) continue;

      const prefix = match[1];
      const hash = match[2];
      const subPath = match[3];
      const name = subPath; // usually the same

      let status: SubmoduleStatus = 'up-to-date';
      let dirty = false;

      if (prefix === '-') {
        status = 'uninitialized';
      } else if (prefix === '+') {
        status = 'modified';
      } else if (prefix === 'U') {
        status = 'dirty';
        dirty = true;
      }

      // Check if working directory is dirty
      if (prefix !== '-') {
        try {
          const subGit = simpleGit(`${this.repoPath}/${subPath}`);
          const subStatus = await subGit.status();
          if (subStatus.files.length > 0) {
            dirty = true;
            if (status === 'up-to-date') status = 'dirty';
          }
        } catch {
          // submodule might not be initialized
        }
      }

      submodules.push({
        name,
        path: subPath,
        url: urlMap.get(name) || '',
        branch: branchMap.get(name),
        currentHash: hash,
        expectedHash: hash, // simplified; real implementation would compare
        status,
        dirty,
      });
    }

    return submodules;
  }

  async add(url: string, path?: string): Promise<void> {
    const git = simpleGit(this.repoPath);
    const args = ['submodule', 'add', url];
    if (path) args.push(path);
    await git.raw(args);
  }

  async update(
    paths?: string[],
    init = false,
    recursive = false,
  ): Promise<void> {
    const git = simpleGit(this.repoPath);
    const args = ['submodule', 'update'];
    if (init) args.push('--init');
    if (recursive) args.push('--recursive');
    if (paths && paths.length > 0) args.push('--', ...paths);
    await git.raw(args);
  }

  async sync(paths?: string[]): Promise<void> {
    const git = simpleGit(this.repoPath);
    const args = ['submodule', 'sync', '--recursive'];
    if (paths && paths.length > 0) args.push('--', ...paths);
    await git.raw(args);
  }

  async remove(subPath: string): Promise<void> {
    const git = simpleGit(this.repoPath);
    // git rm removes from index and working tree
    await git.raw(['rm', subPath]);
    // Also remove from .git/modules
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      await fs.rm(path.join(this.repoPath, '.git', 'modules', subPath), {
        recursive: true,
        force: true,
      });
    } catch {
      // ok if .git/modules entry doesn't exist
    }
    // Remove config entries
    try {
      await git.raw([
        'config',
        '--file',
        '.gitmodules',
        '--remove-section',
        `submodule.${subPath}`,
      ]);
    } catch {
      // section might not exist
    }
  }
}

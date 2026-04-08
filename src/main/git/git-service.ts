import simpleGit, { SimpleGit } from 'simple-git';
import type {
  CommitNode,
  FileStatus,
  BranchInfo,
  RemoteInfo,
  StashEntry,
  DiffFile,
  RepoInfo,
} from '../../shared/git-types';
import { parseUnifiedDiff } from './git-diff-parser';

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async getRepoInfo(): Promise<RepoInfo> {
    const [status, branchSummary] = await Promise.all([
      this.git.status(),
      this.git.branch(),
    ]);

    let state: RepoInfo['state'] = 'clean';
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const gitDir = path.join(this.repoPath, '.git');

    if (
      await fs
        .access(path.join(gitDir, 'MERGE_HEAD'))
        .then(() => true)
        .catch(() => false)
    ) {
      state = 'merging';
    } else if (
      await fs
        .access(path.join(gitDir, 'rebase-merge'))
        .then(() => true)
        .catch(() => false)
    ) {
      state = 'rebasing';
    } else if (
      await fs
        .access(path.join(gitDir, 'CHERRY_PICK_HEAD'))
        .then(() => true)
        .catch(() => false)
    ) {
      state = 'cherry-picking';
    }

    return {
      path: this.repoPath,
      name: path.basename(this.repoPath),
      currentBranch: branchSummary.current,
      isDetached: branchSummary.detached,
      hasRemote: Object.keys(branchSummary.branches).some((b) =>
        b.startsWith('remotes/'),
      ),
      state,
    };
  }

  async getLog(maxCount = 5000, branch?: string): Promise<CommitNode[]> {
    const args = [
      '--all',
      '--topo-order',
      `--format=%H|%h|%P|%D|%an|%ae|%at|%s`,
      `-n${maxCount}`,
    ];
    if (branch) {
      args[0] = branch;
    }

    const result = await this.git.raw(['log', ...args]);
    const lines = result.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const [hash, abbreviatedHash, parentStr, refsStr, authorName, authorEmail, authorDateStr, ...subjectParts] =
        line.split('|');
      return {
        hash,
        abbreviatedHash,
        parents: parentStr ? parentStr.split(' ').filter(Boolean) : [],
        refs: refsStr ? refsStr.split(', ').filter(Boolean) : [],
        authorName,
        authorEmail,
        authorDate: parseInt(authorDateStr, 10),
        subject: subjectParts.join('|'), // rejoin in case subject contains |
      };
    });
  }

  async getStatus(): Promise<FileStatus[]> {
    const status = await this.git.status();
    const files: FileStatus[] = [];

    for (const file of status.files) {
      files.push({
        path: file.path,
        index: (file.index || ' ') as FileStatus['index'],
        workingDir: (file.working_dir || ' ') as FileStatus['workingDir'],
        isStaged: file.index !== ' ' && file.index !== '?',
      });
    }

    return files;
  }

  async getBranches(): Promise<{ local: BranchInfo[]; remote: BranchInfo[] }> {
    const summary = await this.git.branch(['-a', '-v']);

    // Get last commit dates for all branches in one call
    const dateMap = new Map<string, number>();
    try {
      const raw = await this.git.raw([
        'for-each-ref',
        '--sort=-committerdate',
        '--format=%(refname:short)|%(committerdate:unix)',
        'refs/heads/',
        'refs/remotes/',
      ]);
      for (const line of raw.trim().split('\n').filter(Boolean)) {
        const [ref, dateStr] = line.split('|');
        if (ref && dateStr) {
          dateMap.set(ref, parseInt(dateStr, 10));
        }
      }
    } catch {
      // ok if for-each-ref fails
    }

    const local: BranchInfo[] = [];
    const remote: BranchInfo[] = [];

    // Filter out Claude Code worktree branches
    const HIDDEN_BRANCH_PATTERNS = [
      /^claude-worktree-/,
      /^claude-agent-/,
      /^worktree\//,
      /^claude-code-/,
    ];

    for (const [name, info] of Object.entries(summary.branches)) {
      const shortName = info.name.replace(/^remotes\/[^/]+\//, '');
      if (HIDDEN_BRANCH_PATTERNS.some((p) => p.test(shortName))) continue;

      const branch: BranchInfo = {
        name: info.name,
        current: info.current,
        commit: info.commit,
        label: info.label,
        lastCommitDate: dateMap.get(info.name),
      };

      if (name.startsWith('remotes/')) {
        remote.push(branch);
      } else {
        local.push(branch);
      }
    }

    return { local, remote };
  }

  async getRemotes(): Promise<RemoteInfo[]> {
    const remotes = await this.git.getRemotes(true);
    return remotes.map((r) => ({
      name: r.name,
      fetchUrl: r.refs.fetch || '',
      pushUrl: r.refs.push || '',
    }));
  }

  async getStashList(): Promise<StashEntry[]> {
    const result = await this.git.stashList();
    return result.all.map((entry, index) => ({
      index,
      date: entry.date,
      message: entry.message,
      hash: entry.hash,
    }));
  }

  async stage(files: string[]): Promise<void> {
    await this.git.add(files);
  }

  async unstage(files: string[]): Promise<void> {
    await this.git.reset(['HEAD', '--', ...files]);
  }

  async commit(message: string, amend = false): Promise<string> {
    const args = amend ? ['--amend'] : [];
    const result = await this.git.commit(message, undefined, Object.fromEntries(args.map(a => [a, null])));
    return result.commit || '';
  }

  async checkout(branch: string): Promise<void> {
    await this.git.checkout(branch);
  }

  async createBranch(name: string, startPoint?: string): Promise<void> {
    const args = startPoint ? [name, startPoint] : [name];
    await this.git.checkoutBranch(name, startPoint || 'HEAD');
  }

  async deleteBranch(name: string, force = false): Promise<void> {
    if (force) {
      await this.git.branch(['-D', name]);
    } else {
      await this.git.branch(['-d', name]);
    }
  }

  async merge(branch: string, noFf = false): Promise<void> {
    const options = noFf ? ['--no-ff'] : [];
    await this.git.merge([branch, ...options]);
  }

  async rebase(onto: string): Promise<void> {
    await this.git.rebase([onto]);
  }

  async push(
    remote = 'origin',
    branch?: string,
    force = false,
  ): Promise<void> {
    const args: string[] = [];
    if (force) args.push('--force-with-lease');
    await this.git.push(remote, branch, args);
  }

  async pull(remote?: string, rebase = false): Promise<void> {
    const options: Record<string, null> = {};
    if (rebase) options['--rebase'] = null;
    await this.git.pull(remote, undefined, options);
  }

  async fetch(remote?: string): Promise<void> {
    if (remote) {
      await this.git.fetch(remote);
    } else {
      await this.git.fetch(['--all']);
    }
  }

  async stashSave(message?: string): Promise<void> {
    if (message) {
      await this.git.stash(['push', '-m', message]);
    } else {
      await this.git.stash(['push']);
    }
  }

  async stashApply(index: number): Promise<void> {
    await this.git.stash(['apply', `stash@{${index}}`]);
  }

  async stashDrop(index: number): Promise<void> {
    await this.git.stash(['drop', `stash@{${index}}`]);
  }

  async getDiffForFile(
    filePath: string,
    staged = false,
  ): Promise<DiffFile> {
    const args = staged
      ? ['diff', '--cached', '--', filePath]
      : ['diff', '--', filePath];
    const raw = await this.git.raw(args);
    const files = parseUnifiedDiff(raw);
    return files[0] || {
      oldPath: filePath,
      newPath: filePath,
      status: 'modified',
      hunks: [],
    };
  }

  async getDiffForCommit(hash: string): Promise<DiffFile[]> {
    const raw = await this.git.raw(['diff', `${hash}~1`, hash]);
    return parseUnifiedDiff(raw);
  }

  async getBlame(
    filePath: string,
  ): Promise<
    Array<{
      hash: string;
      author: string;
      date: string;
      lineNumber: number;
      content: string;
    }>
  > {
    const raw = await this.git.raw([
      'blame',
      '--porcelain',
      '--',
      filePath,
    ]);
    const lines = raw.split('\n');
    const result: Array<{
      hash: string;
      author: string;
      date: string;
      lineNumber: number;
      content: string;
    }> = [];

    let currentHash = '';
    let currentAuthor = '';
    let currentDate = '';
    let lineNumber = 0;

    for (const line of lines) {
      if (/^[0-9a-f]{40}/.test(line)) {
        const parts = line.split(' ');
        currentHash = parts[0];
        lineNumber = parseInt(parts[2], 10);
      } else if (line.startsWith('author ')) {
        currentAuthor = line.slice(7);
      } else if (line.startsWith('author-time ')) {
        const ts = parseInt(line.slice(12), 10);
        currentDate = new Date(ts * 1000).toISOString();
      } else if (line.startsWith('\t')) {
        result.push({
          hash: currentHash,
          author: currentAuthor,
          date: currentDate,
          lineNumber,
          content: line.slice(1),
        });
      }
    }

    return result;
  }

  async searchCommits(query: string): Promise<CommitNode[]> {
    const result = await this.git.raw([
      'log',
      '--all',
      `--grep=${query}`,
      '--format=%H|%h|%P|%D|%an|%ae|%at|%s',
      '-n100',
    ]);
    const lines = result.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      const [hash, abbreviatedHash, parentStr, refsStr, authorName, authorEmail, authorDateStr, ...subjectParts] =
        line.split('|');
      return {
        hash,
        abbreviatedHash,
        parents: parentStr ? parentStr.split(' ').filter(Boolean) : [],
        refs: refsStr ? refsStr.split(', ').filter(Boolean) : [],
        authorName,
        authorEmail,
        authorDate: parseInt(authorDateStr, 10),
        subject: subjectParts.join('|'),
      };
    });
  }
}

// Cache of GitService instances per repo path
const serviceCache = new Map<string, GitService>();

export function getGitService(repoPath: string): GitService {
  if (!serviceCache.has(repoPath)) {
    serviceCache.set(repoPath, new GitService(repoPath));
  }
  return serviceCache.get(repoPath)!;
}

import simpleGit, { SimpleGit } from 'simple-git';
import type {
  CommitNode,
  FileStatus,
  BranchInfo,
  RemoteInfo,
  StashEntry,
  DiffFile,
  RepoInfo,
  TagInfo,
  GitConfig,
  RepoStats,
  ContributorStats,
  FileConstellationData,
  ConstellationNode,
  ConstellationEdge,
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

  async getCommitByHash(hash: string): Promise<CommitNode | null> {
    try {
      // Use %x00 as body delimiter to safely parse multi-line bodies
      const result = await this.git.raw([
        'log',
        '-1',
        `--format=%H|%h|%P|%D|%an|%ae|%at|%s%x00%b`,
        hash,
      ]);
      const raw = result.trim();
      if (!raw) return null;
      const [header, body] = raw.split('\0');
      const [h, abbreviatedHash, parentStr, refsStr, authorName, authorEmail, authorDateStr, ...subjectParts] =
        header.split('|');
      return {
        hash: h,
        abbreviatedHash,
        parents: parentStr ? parentStr.split(' ').filter(Boolean) : [],
        refs: refsStr ? refsStr.split(', ').filter(Boolean) : [],
        authorName,
        authorEmail,
        authorDate: parseInt(authorDateStr, 10),
        subject: subjectParts.join('|'),
        body: body?.trim() || undefined,
      };
    } catch {
      return null;
    }
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
      /^worktree-agent-/,
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

  async cherryPick(hash: string): Promise<void> {
    await this.git.raw(['cherry-pick', hash]);
  }

  async revertCommit(hash: string): Promise<void> {
    await this.git.raw(['revert', hash]);
  }

  async resetTo(hash: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    await this.git.raw(['reset', `--${mode}`, hash]);
  }

  async stashPop(index: number): Promise<void> {
    await this.git.stash(['pop', `stash@{${index}}`]);
  }

  async merge(branch: string, noFf = false): Promise<void> {
    const options = noFf ? ['--no-ff'] : [];
    await this.git.merge([branch, ...options]);
  }

  async rebase(onto: string): Promise<void> {
    await this.git.rebase([onto]);
  }

  async abortMerge(): Promise<void> {
    await this.git.merge(['--abort']);
  }

  async abortRebase(): Promise<void> {
    await this.git.rebase(['--abort']);
  }

  async abortCherryPick(): Promise<void> {
    await this.git.raw(['cherry-pick', '--abort']);
  }

  async continueRebase(): Promise<void> {
    await this.git.rebase(['--continue']);
  }

  async continueCherryPick(): Promise<void> {
    await this.git.raw(['cherry-pick', '--continue']);
  }

  async continueMerge(): Promise<void> {
    await this.git.commit('');
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
    try {
      // Use show which works for all commits including root and merges
      const raw = await this.git.raw([
        'show',
        '--format=',     // suppress commit header
        '--patch',
        '--first-parent', // for merges, diff against first parent only
        hash,
      ]);
      return parseUnifiedDiff(raw);
    } catch (err) {
      // Fallback: try diff-tree for root commits
      try {
        const raw = await this.git.raw([
          'diff-tree',
          '-p',
          '--root',
          hash,
        ]);
        return parseUnifiedDiff(raw);
      } catch (err2) {
        console.error('getDiffForCommit failed for', hash, err, err2);
        return [];
      }
    }
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

  async getTags(): Promise<TagInfo[]> {
    try {
      const raw = await this.git.raw([
        'tag',
        '-l',
        '--sort=-creatordate',
        '--format=%(refname:short)|%(objectname:short)|%(objecttype)|%(creatordate:unix)|%(creator)|%(subject)',
      ]);
      const lines = raw.trim().split('\n').filter(Boolean);
      return lines.map((line) => {
        const [name, hash, objectType, dateStr, creator, ...msgParts] = line.split('|');
        return {
          name,
          hash,
          isAnnotated: objectType === 'tag',
          date: dateStr ? parseInt(dateStr, 10) : undefined,
          tagger: creator || undefined,
          message: msgParts.join('|') || undefined,
        };
      });
    } catch {
      return [];
    }
  }

  async createTag(name: string, hash?: string, message?: string, annotated?: boolean): Promise<void> {
    const args = ['tag'];
    if (annotated || message) {
      args.push('-a', name);
      args.push('-m', message || name);
    } else {
      args.push(name);
    }
    if (hash) args.push(hash);
    await this.git.raw(args);
  }

  async deleteTag(name: string): Promise<void> {
    await this.git.raw(['tag', '-d', name]);
  }

  async pushTag(name: string, remote = 'origin'): Promise<void> {
    await this.git.push(remote, name);
  }

  async getGitConfig(): Promise<GitConfig> {
    const get = async (key: string, global = false): Promise<string | undefined> => {
      try {
        const args = global ? ['config', '--global', key] : ['config', key];
        const result = await this.git.raw(args);
        return result.trim() || undefined;
      } catch {
        return undefined;
      }
    };
    const [userName, userEmail, globalUserName, globalUserEmail] = await Promise.all([
      get('user.name'),
      get('user.email'),
      get('user.name', true),
      get('user.email', true),
    ]);
    return { userName, userEmail, globalUserName, globalUserEmail };
  }

  async setGitConfig(key: string, value: string, global = false): Promise<void> {
    const args = global ? ['config', '--global', key, value] : ['config', key, value];
    await this.git.raw(args);
  }

  async getTrackedFiles(): Promise<string[]> {
    const result = await this.git.raw(['ls-files']);
    return result.trim().split('\n').filter(Boolean);
  }

  async getStats(): Promise<RepoStats> {
    // Fetch all commits with author info and timestamps
    const result = await this.git.raw([
      'log',
      '--all',
      '--format=%an|%ae|%at',
    ]);
    const lines = result.trim().split('\n').filter(Boolean);

    const contributorMap = new Map<string, ContributorStats>();
    const commitsByDay: Record<string, number> = {};
    const commitsByHour = new Array(24).fill(0);
    const commitsByDayOfWeek = new Array(7).fill(0);
    let firstCommitDate = Infinity;
    let lastCommitDate = 0;

    for (const line of lines) {
      const [authorName, authorEmail, tsStr] = line.split('|');
      const ts = parseInt(tsStr, 10);
      if (isNaN(ts)) continue;

      const date = new Date(ts * 1000);
      if (ts < firstCommitDate) firstCommitDate = ts;
      if (ts > lastCommitDate) lastCommitDate = ts;

      // By day
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      commitsByDay[dayKey] = (commitsByDay[dayKey] || 0) + 1;

      // By hour & day of week
      commitsByHour[date.getHours()]++;
      commitsByDayOfWeek[date.getDay()]++;

      // Contributors
      const key = `${authorName}|${authorEmail}`;
      const existing = contributorMap.get(key);
      if (existing) {
        existing.commits++;
        if (ts < existing.firstCommit) existing.firstCommit = ts;
        if (ts > existing.lastCommit) existing.lastCommit = ts;
      } else {
        contributorMap.set(key, {
          name: authorName,
          email: authorEmail,
          commits: 1,
          firstCommit: ts,
          lastCommit: ts,
        });
      }
    }

    const contributors = Array.from(contributorMap.values())
      .sort((a, b) => b.commits - a.commits);

    // Language breakdown from tracked files
    const filesRaw = await this.git.raw(['ls-files']);
    const files = filesRaw.trim().split('\n').filter(Boolean);
    const languageBreakdown: Record<string, number> = {};
    for (const f of files) {
      const dot = f.lastIndexOf('.');
      const ext = dot > 0 ? f.slice(dot + 1).toLowerCase() : 'other';
      languageBreakdown[ext] = (languageBreakdown[ext] || 0) + 1;
    }

    return {
      totalCommits: lines.length,
      firstCommitDate: firstCommitDate === Infinity ? 0 : firstCommitDate,
      lastCommitDate,
      contributors,
      commitsByDay,
      commitsByHour,
      commitsByDayOfWeek,
      languageBreakdown,
    };
  }

  async getFileConstellation(maxCommits = 1000): Promise<FileConstellationData> {
    // Get files changed per commit
    const raw = await this.git.raw([
      'log',
      '--all',
      '--name-only',
      '--format=%x00',
      `-n${maxCommits}`,
    ]);

    // Parse: commits are separated by \0, files by newlines
    const commits = raw.split('\0').filter(Boolean);
    const fileChangeCount = new Map<string, number>();
    const coChangeCount = new Map<string, number>(); // "fileA\0fileB" → count

    for (const block of commits) {
      const files = block.trim().split('\n').filter(Boolean);
      // Count individual file changes
      for (const f of files) {
        fileChangeCount.set(f, (fileChangeCount.get(f) || 0) + 1);
      }
      // Count pairwise co-changes (only if commit touches <= 30 files to avoid noise)
      if (files.length >= 2 && files.length <= 30) {
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const key = files[i] < files[j] ? `${files[i]}\0${files[j]}` : `${files[j]}\0${files[i]}`;
            coChangeCount.set(key, (coChangeCount.get(key) || 0) + 1);
          }
        }
      }
    }

    // Build nodes: only include files that appear at least twice
    const relevantFiles = [...fileChangeCount.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 300); // cap at 300 nodes for performance

    const pathToId = new Map<string, number>();
    const nodes: ConstellationNode[] = relevantFiles.map(([path, changeCount], i) => {
      pathToId.set(path, i);
      const dot = path.lastIndexOf('.');
      const ext = dot > 0 ? path.slice(dot + 1).toLowerCase() : 'other';
      return { id: i, path, ext, changeCount };
    });

    // Build edges: only between nodes that both exist, with weight >= 2
    const edges: ConstellationEdge[] = [];
    for (const [key, weight] of coChangeCount) {
      if (weight < 2) continue;
      const [a, b] = key.split('\0');
      const sourceId = pathToId.get(a);
      const targetId = pathToId.get(b);
      if (sourceId !== undefined && targetId !== undefined) {
        edges.push({ source: sourceId, target: targetId, weight });
      }
    }

    // Sort edges by weight desc and cap for performance
    edges.sort((a, b) => b.weight - a.weight);
    const cappedEdges = edges.slice(0, 1500);

    return { nodes, edges: cappedEdges };
  }

  // ─── Remote management ───────────────────────────────────────────

  async addRemote(name: string, url: string): Promise<void> {
    await this.git.addRemote(name, url);
  }

  async removeRemote(name: string): Promise<void> {
    await this.git.removeRemote(name);
  }

  async renameRemote(oldName: string, newName: string): Promise<void> {
    await this.git.raw(['remote', 'rename', oldName, newName]);
  }

  async setRemoteUrl(name: string, url: string): Promise<void> {
    await this.git.raw(['remote', 'set-url', name, url]);
  }

  // ─── Diff options ──────────────────────────────────────────────

  async getDiffForFileWithOptions(
    filePath: string,
    staged = false,
    options?: { ignoreWhitespace?: boolean; contextLines?: number },
  ): Promise<DiffFile> {
    const args = staged
      ? ['diff', '--cached']
      : ['diff'];
    if (options?.ignoreWhitespace) args.push('-w');
    if (options?.contextLines !== undefined) args.push(`-U${options.contextLines}`);
    args.push('--', filePath);
    const raw = await this.git.raw(args);
    const files = parseUnifiedDiff(raw);
    return files[0] || {
      oldPath: filePath,
      newPath: filePath,
      status: 'modified',
      hunks: [],
    };
  }

  // ─── Stash show ────────────────────────────────────────────────

  async getStashDiff(index: number): Promise<DiffFile[]> {
    try {
      const raw = await this.git.raw([
        'stash', 'show', '-p', `stash@{${index}}`,
      ]);
      return parseUnifiedDiff(raw);
    } catch (err) {
      console.error('getStashDiff failed for index', index, err);
      return [];
    }
  }

  // ─── Log filtering ────────────────────────────────────────────

  async getFilteredLog(options: {
    maxCount?: number;
    branch?: string;
    author?: string;
    since?: string;
    until?: string;
    searchText?: string;
  }): Promise<CommitNode[]> {
    const args = [
      'log',
      options.branch || '--all',
      '--topo-order',
      `--format=%H|%h|%P|%D|%an|%ae|%at|%s`,
      `-n${options.maxCount || 5000}`,
    ];
    if (options.author) args.push(`--author=${options.author}`);
    if (options.since) args.push(`--since=${options.since}`);
    if (options.until) args.push(`--until=${options.until}`);
    if (options.searchText) args.push(`--grep=${options.searchText}`);

    const result = await this.git.raw(args);
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

  // ─── Line-level staging ────────────────────────────────────────

  async stageLines(filePath: string, patch: string): Promise<void> {
    // Apply a partial patch to the index
    const { execSync } = await import('node:child_process');
    execSync('git apply --cached --unidiff-zero -', {
      input: patch,
      cwd: this.repoPath,
      encoding: 'utf-8',
    });
  }

  async unstageLines(filePath: string, patch: string): Promise<void> {
    const { execSync } = await import('node:child_process');
    execSync('git apply --cached --reverse --unidiff-zero -', {
      input: patch,
      cwd: this.repoPath,
      encoding: 'utf-8',
    });
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

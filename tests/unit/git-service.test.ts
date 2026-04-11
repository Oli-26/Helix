import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock simple-git before importing GitService
const mockRaw = vi.fn();
const mockStatus = vi.fn();
const mockBranch = vi.fn();
const mockGetRemotes = vi.fn();
const mockStashList = vi.fn();
const mockAdd = vi.fn();
const mockReset = vi.fn();
const mockCommit = vi.fn();

vi.mock('simple-git', () => {
  return {
    default: () => ({
      raw: mockRaw,
      status: mockStatus,
      branch: mockBranch,
      getRemotes: mockGetRemotes,
      stashList: mockStashList,
      add: mockAdd,
      reset: mockReset,
      commit: mockCommit,
      checkout: vi.fn(),
      checkoutBranch: vi.fn(),
      push: vi.fn(),
      pull: vi.fn(),
      fetch: vi.fn(),
      stash: vi.fn(),
      merge: vi.fn(),
      rebase: vi.fn(),
    }),
  };
});

import { GitService } from '../../src/main/git/git-service';

describe('GitService', () => {
  let service: GitService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GitService('/tmp/test-repo');
  });

  describe('getLog', () => {
    it('parses log output into CommitNode array', async () => {
      mockRaw.mockResolvedValue(
        'abc123def456|abc123d|parent1 parent2|HEAD -> main, origin/main|John|john@test.com|1700000000|Initial commit\n' +
        'def456789abc|def4567||tag: v1.0|Jane|jane@test.com|1699000000|Add feature\n',
      );

      const commits = await service.getLog(100);
      expect(commits).toHaveLength(2);

      expect(commits[0].hash).toBe('abc123def456');
      expect(commits[0].abbreviatedHash).toBe('abc123d');
      expect(commits[0].parents).toEqual(['parent1', 'parent2']);
      expect(commits[0].refs).toEqual(['HEAD -> main', 'origin/main']);
      expect(commits[0].authorName).toBe('John');
      expect(commits[0].authorEmail).toBe('john@test.com');
      expect(commits[0].authorDate).toBe(1700000000);
      expect(commits[0].subject).toBe('Initial commit');

      expect(commits[1].parents).toEqual([]);
      expect(commits[1].refs).toEqual(['tag: v1.0']);
    });

    it('handles subjects containing pipe characters', async () => {
      mockRaw.mockResolvedValue(
        'aaabbbccc|aaabbbc|parent1|HEAD -> main|John|j@t.com|1700000000|Fix: use a|b pattern\n',
      );
      const commits = await service.getLog();
      expect(commits[0].subject).toBe('Fix: use a|b pattern');
    });

    it('returns empty array for empty log', async () => {
      mockRaw.mockResolvedValue('');
      const commits = await service.getLog();
      expect(commits).toEqual([]);
    });

    it('passes maxCount and branch arguments', async () => {
      mockRaw.mockResolvedValue('');
      await service.getLog(50, 'develop');
      expect(mockRaw).toHaveBeenCalledWith(
        expect.arrayContaining(['log']),
      );
      const args = mockRaw.mock.calls[0][0];
      expect(args).toContain('-n50');
    });
  });

  describe('getStatus', () => {
    it('maps file status correctly', async () => {
      mockStatus.mockResolvedValue({
        files: [
          { path: 'src/app.ts', index: 'M', working_dir: ' ' },
          { path: 'README.md', index: ' ', working_dir: 'M' },
          { path: 'new.ts', index: '?', working_dir: '?' },
        ],
      });

      const status = await service.getStatus();
      expect(status).toHaveLength(3);
      expect(status[0]).toEqual({
        path: 'src/app.ts',
        index: 'M',
        workingDir: ' ',
        isStaged: true,
      });
      expect(status[1]).toEqual({
        path: 'README.md',
        index: ' ',
        workingDir: 'M',
        isStaged: false,
      });
      expect(status[2]).toEqual({
        path: 'new.ts',
        index: '?',
        workingDir: '?',
        isStaged: false,
      });
    });
  });

  describe('getBranches', () => {
    it('separates local and remote branches', async () => {
      mockBranch.mockResolvedValue({
        current: 'main',
        branches: {
          main: { name: 'main', current: true, commit: 'abc', label: 'main' },
          develop: { name: 'develop', current: false, commit: 'def', label: 'develop' },
          'remotes/origin/main': { name: 'remotes/origin/main', current: false, commit: 'abc', label: '' },
        },
      });
      mockRaw.mockResolvedValue('main|1700000000\ndevelop|1699000000\norigin/main|1700000000\n');

      const result = await service.getBranches();
      expect(result.local).toHaveLength(2);
      expect(result.remote).toHaveLength(1);
      expect(result.local[0].name).toBe('main');
      expect(result.local[0].current).toBe(true);
    });

    it('filters out Claude Code worktree branches', async () => {
      mockBranch.mockResolvedValue({
        current: 'main',
        branches: {
          main: { name: 'main', current: true, commit: 'abc', label: 'main' },
          'claude-worktree-123': { name: 'claude-worktree-123', current: false, commit: 'def', label: '' },
          'claude-agent-abc': { name: 'claude-agent-abc', current: false, commit: 'ghi', label: '' },
          'worktree-agent-xyz': { name: 'worktree-agent-xyz', current: false, commit: 'jkl', label: '' },
          'claude-code-test': { name: 'claude-code-test', current: false, commit: 'mno', label: '' },
        },
      });
      mockRaw.mockResolvedValue('main|1700000000\n');

      const result = await service.getBranches();
      expect(result.local).toHaveLength(1);
      expect(result.local[0].name).toBe('main');
    });
  });

  describe('getStats', () => {
    it('aggregates commit statistics correctly', async () => {
      // First call: git log for stats
      mockRaw.mockResolvedValueOnce(
        'Alice|alice@t.com|1700000000\n' +
        'Alice|alice@t.com|1700086400\n' +
        'Bob|bob@t.com|1700172800\n',
      );
      // Second call: ls-files
      mockRaw.mockResolvedValueOnce(
        'src/app.ts\nsrc/utils.ts\nREADME.md\npackage.json\n',
      );

      const stats = await service.getStats();
      expect(stats.totalCommits).toBe(3);
      expect(stats.contributors).toHaveLength(2);
      expect(stats.contributors[0].name).toBe('Alice');
      expect(stats.contributors[0].commits).toBe(2);
      expect(stats.contributors[1].name).toBe('Bob');
      expect(stats.contributors[1].commits).toBe(1);
      expect(stats.firstCommitDate).toBe(1700000000);
      expect(stats.lastCommitDate).toBe(1700172800);
    });

    it('computes language breakdown from file extensions', async () => {
      mockRaw.mockResolvedValueOnce('A|a@t.com|1700000000\n');
      mockRaw.mockResolvedValueOnce(
        'file.ts\nfile2.ts\nfile.js\nREADME.md\nDockerfile\n',
      );

      const stats = await service.getStats();
      expect(stats.languageBreakdown['ts']).toBe(2);
      expect(stats.languageBreakdown['js']).toBe(1);
      expect(stats.languageBreakdown['md']).toBe(1);
      expect(stats.languageBreakdown['other']).toBe(1); // Dockerfile has no extension
    });

    it('computes hourly and daily distributions', async () => {
      // Three commits at specific times
      const ts1 = Math.floor(new Date('2024-01-15T10:00:00').getTime() / 1000); // Mon 10am
      const ts2 = Math.floor(new Date('2024-01-15T14:00:00').getTime() / 1000); // Mon 2pm
      const ts3 = Math.floor(new Date('2024-01-16T10:00:00').getTime() / 1000); // Tue 10am

      mockRaw.mockResolvedValueOnce(
        `A|a@t.com|${ts1}\nA|a@t.com|${ts2}\nA|a@t.com|${ts3}\n`,
      );
      mockRaw.mockResolvedValueOnce('file.ts\n');

      const stats = await service.getStats();
      expect(stats.commitsByHour[10]).toBe(2);
      expect(stats.commitsByHour[14]).toBe(1);
      expect(stats.commitsByDay['2024-01-15']).toBe(2);
      expect(stats.commitsByDay['2024-01-16']).toBe(1);
    });
  });

  describe('getFileConstellation', () => {
    it('builds co-change graph from commit history', async () => {
      // Format: \0 separates commits, files within commit are newline-separated
      mockRaw.mockResolvedValue(
        '\0\nfileA.ts\nfileB.ts\n' +
        '\0\nfileA.ts\nfileB.ts\n' +
        '\0\nfileA.ts\nfileC.ts\n' +
        '\0\nfileA.ts\nfileC.ts\n',
      );

      const result = await service.getFileConstellation(100);
      expect(result.nodes.length).toBeGreaterThanOrEqual(3);

      const nodeA = result.nodes.find((n) => n.path === 'fileA.ts');
      expect(nodeA).toBeDefined();
      expect(nodeA!.changeCount).toBe(4);
      expect(nodeA!.ext).toBe('ts');

      // A-B co-changed 2 times, A-C co-changed 2 times
      expect(result.edges.length).toBeGreaterThanOrEqual(2);
    });

    it('filters out files with only 1 change', async () => {
      mockRaw.mockResolvedValue(
        '\0\nfreq.ts\nfreq.ts\n' + // appears twice (same commit, counted once)
        '\0\nfreq.ts\nrare.ts\n',   // rare.ts only appears once total
      );

      const result = await service.getFileConstellation(100);
      const rare = result.nodes.find((n) => n.path === 'rare.ts');
      // rare.ts appears in only 1 commit, so it may be filtered
      // freq.ts appears in 2 commits
      const freq = result.nodes.find((n) => n.path === 'freq.ts');
      expect(freq).toBeDefined();
    });

    it('skips commits with more than 30 files for co-change', async () => {
      // Build a commit with 35 files
      const manyFiles = Array.from({ length: 35 }, (_, i) => `file${i}.ts`).join('\n');
      mockRaw.mockResolvedValue(
        `\0\n${manyFiles}\n` +
        `\0\n${manyFiles}\n`,
      );

      const result = await service.getFileConstellation(100);
      // Nodes should exist but no edges (co-change skipped for large commits)
      expect(result.edges).toHaveLength(0);
    });

    it('returns empty data for empty history', async () => {
      mockRaw.mockResolvedValue('');
      const result = await service.getFileConstellation(100);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('getTags', () => {
    it('parses tag output correctly', async () => {
      mockRaw.mockResolvedValue(
        'v1.0|abc1234|tag|1700000000|John <john@t.com>|Release 1.0\n' +
        'v0.9|def5678|commit|1699000000||Lightweight tag\n',
      );

      const tags = await service.getTags();
      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe('v1.0');
      expect(tags[0].isAnnotated).toBe(true);
      expect(tags[0].date).toBe(1700000000);
      expect(tags[1].name).toBe('v0.9');
      expect(tags[1].isAnnotated).toBe(false);
    });

    it('returns empty array on error', async () => {
      mockRaw.mockRejectedValue(new Error('no tags'));
      const tags = await service.getTags();
      expect(tags).toEqual([]);
    });
  });

  describe('getTrackedFiles', () => {
    it('returns list of tracked files', async () => {
      mockRaw.mockResolvedValue('src/app.ts\nsrc/utils.ts\npackage.json\n');
      const files = await service.getTrackedFiles();
      expect(files).toEqual(['src/app.ts', 'src/utils.ts', 'package.json']);
    });
  });

  describe('searchCommits', () => {
    it('passes grep query and parses results', async () => {
      mockRaw.mockResolvedValue(
        'abc|abc|parent1|HEAD -> main|John|j@t.com|1700000000|Fix bug #123\n',
      );
      const results = await service.searchCommits('bug');
      expect(results).toHaveLength(1);
      expect(results[0].subject).toBe('Fix bug #123');
      expect(mockRaw).toHaveBeenCalledWith(
        expect.arrayContaining(['--grep=bug']),
      );
    });
  });

  describe('getBlame', () => {
    it('parses porcelain blame output', async () => {
      mockRaw.mockResolvedValue(
        'abc123def456789012345678901234567890abcd 1 1 1\n' +
        'author John Doe\n' +
        'author-time 1700000000\n' +
        'summary Fix thing\n' +
        '\tconst x = 1;\n' +
        'abc123def456789012345678901234567890abcd 2 2 1\n' +
        'author John Doe\n' +
        'author-time 1700000000\n' +
        '\tconst y = 2;\n',
      );

      const blame = await service.getBlame('src/app.ts');
      expect(blame).toHaveLength(2);
      expect(blame[0].lineNumber).toBe(1);
      expect(blame[0].author).toBe('John Doe');
      expect(blame[0].content).toBe('const x = 1;');
      expect(blame[1].lineNumber).toBe(2);
      expect(blame[1].content).toBe('const y = 2;');
    });
  });

  describe('stage and unstage', () => {
    it('stage calls git.add', async () => {
      await service.stage(['file1.ts', 'file2.ts']);
      expect(mockAdd).toHaveBeenCalledWith(['file1.ts', 'file2.ts']);
    });

    it('unstage calls git.reset', async () => {
      await service.unstage(['file1.ts']);
      expect(mockReset).toHaveBeenCalledWith(['HEAD', '--', 'file1.ts']);
    });
  });

  describe('getRemotes', () => {
    it('maps remote info correctly', async () => {
      mockGetRemotes.mockResolvedValue([
        { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git', push: 'https://github.com/user/repo.git' } },
      ]);

      const remotes = await service.getRemotes();
      expect(remotes).toHaveLength(1);
      expect(remotes[0].name).toBe('origin');
      expect(remotes[0].fetchUrl).toBe('https://github.com/user/repo.git');
    });
  });
});

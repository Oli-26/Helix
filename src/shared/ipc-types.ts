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
  FileConstellationData,
} from './git-types';
import type { SubmoduleInfo } from './submodule-types';

// IPC Channel definitions: maps channel name → { args, return }
export interface IpcChannelMap {
  // Repository
  'git:repo-info': { args: { repoPath: string }; return: RepoInfo };
  'git:open-repo': { args: void; return: string | null }; // opens dialog, returns path
  'git:clone': {
    args: { url: string; directory: string };
    return: string;
  };
  'git:init': { args: { directory: string }; return: string };

  // Log / History
  'git:log': {
    args: { repoPath: string; maxCount?: number; branch?: string };
    return: CommitNode[];
  };
  'git:commit-detail': {
    args: { repoPath: string; hash: string };
    return: { commit: CommitNode; files: DiffFile[] };
  };

  // Status
  'git:status': { args: { repoPath: string }; return: FileStatus[] };

  // Staging
  'git:stage': { args: { repoPath: string; files: string[] }; return: void };
  'git:unstage': {
    args: { repoPath: string; files: string[] };
    return: void;
  };
  'git:discard-changes': {
    args: { repoPath: string; files: string[] };
    return: void;
  };

  // Commit
  'git:commit': {
    args: { repoPath: string; message: string; amend?: boolean };
    return: string; // new commit hash
  };

  // Diff
  'git:diff-file': {
    args: { repoPath: string; filePath: string; staged?: boolean };
    return: DiffFile;
  };
  'git:diff-commit': {
    args: { repoPath: string; hash: string };
    return: DiffFile[];
  };

  // Branches
  'git:branches': {
    args: { repoPath: string };
    return: { local: BranchInfo[]; remote: BranchInfo[] };
  };
  'git:checkout': {
    args: { repoPath: string; branch: string };
    return: void;
  };
  'git:create-branch': {
    args: { repoPath: string; name: string; startPoint?: string };
    return: void;
  };
  'git:delete-branch': {
    args: { repoPath: string; name: string; force?: boolean };
    return: void;
  };
  'git:merge': {
    args: { repoPath: string; branch: string; noFf?: boolean };
    return: void;
  };
  'git:rebase': {
    args: { repoPath: string; onto: string };
    return: void;
  };
  'git:cherry-pick': {
    args: { repoPath: string; hash: string };
    return: void;
  };
  'git:revert': {
    args: { repoPath: string; hash: string };
    return: void;
  };
  'git:reset': {
    args: { repoPath: string; hash: string; mode?: 'soft' | 'mixed' | 'hard' };
    return: void;
  };
  'git:stash-pop': {
    args: { repoPath: string; index: number };
    return: void;
  };

  // Remotes
  'git:remotes': { args: { repoPath: string }; return: RemoteInfo[] };
  'git:push': {
    args: {
      repoPath: string;
      remote?: string;
      branch?: string;
      force?: boolean;
    };
    return: void;
  };
  'git:pull': {
    args: { repoPath: string; remote?: string; rebase?: boolean };
    return: void;
  };
  'git:fetch': {
    args: { repoPath: string; remote?: string };
    return: void;
  };

  // Stash
  'git:stash-list': { args: { repoPath: string }; return: StashEntry[] };
  'git:stash-save': {
    args: { repoPath: string; message?: string };
    return: void;
  };
  'git:stash-apply': {
    args: { repoPath: string; index: number };
    return: void;
  };
  'git:stash-drop': {
    args: { repoPath: string; index: number };
    return: void;
  };

  // Blame
  'git:blame': {
    args: { repoPath: string; filePath: string };
    return: Array<{
      hash: string;
      author: string;
      date: string;
      lineNumber: number;
      content: string;
    }>;
  };

  // Tags
  'git:tags': { args: { repoPath: string }; return: TagInfo[] };
  'git:create-tag': {
    args: { repoPath: string; name: string; hash?: string; message?: string; annotated?: boolean };
    return: void;
  };
  'git:delete-tag': {
    args: { repoPath: string; name: string };
    return: void;
  };
  'git:push-tag': {
    args: { repoPath: string; name: string; remote?: string };
    return: void;
  };

  // Config
  'git:get-config': { args: { repoPath: string }; return: GitConfig };
  'git:set-config': {
    args: { repoPath: string; key: string; value: string; global?: boolean };
    return: void;
  };

  // File listing
  'git:ls-files': { args: { repoPath: string }; return: string[] };

  // Stats
  'git:stats': { args: { repoPath: string }; return: RepoStats };
  'git:file-constellation': { args: { repoPath: string; maxCommits?: number }; return: FileConstellationData };

  // Abort / Continue operations
  'git:abort-merge': { args: { repoPath: string }; return: void };
  'git:abort-rebase': { args: { repoPath: string }; return: void };
  'git:abort-cherry-pick': { args: { repoPath: string }; return: void };
  'git:continue-merge': { args: { repoPath: string }; return: void };
  'git:continue-rebase': { args: { repoPath: string }; return: void };
  'git:continue-cherry-pick': { args: { repoPath: string }; return: void };

  // Remote management
  'git:add-remote': { args: { repoPath: string; name: string; url: string }; return: void };
  'git:remove-remote': { args: { repoPath: string; name: string }; return: void };
  'git:rename-remote': { args: { repoPath: string; oldName: string; newName: string }; return: void };
  'git:set-remote-url': { args: { repoPath: string; name: string; url: string }; return: void };

  // Diff with options
  'git:diff-file-options': {
    args: { repoPath: string; filePath: string; staged?: boolean; ignoreWhitespace?: boolean; contextLines?: number };
    return: DiffFile;
  };

  // Stash diff
  'git:stash-diff': { args: { repoPath: string; index: number }; return: DiffFile[] };

  // Filtered log
  'git:log-filtered': {
    args: { repoPath: string; maxCount?: number; branch?: string; author?: string; since?: string; until?: string; searchText?: string };
    return: CommitNode[];
  };

  // Line-level staging
  'git:stage-lines': { args: { repoPath: string; filePath: string; patch: string }; return: void };
  'git:unstage-lines': { args: { repoPath: string; filePath: string; patch: string }; return: void };

  // Clone directory picker
  'git:pick-directory': { args: void; return: string | null };

  // Search
  'git:search-commits': {
    args: { repoPath: string; query: string };
    return: CommitNode[];
  };

  // Submodules
  'git:submodule-list': {
    args: { repoPath: string };
    return: SubmoduleInfo[];
  };
  'git:submodule-add': {
    args: { repoPath: string; url: string; path?: string };
    return: void;
  };
  'git:submodule-update': {
    args: { repoPath: string; paths?: string[]; init?: boolean; recursive?: boolean };
    return: void;
  };
  'git:submodule-sync': {
    args: { repoPath: string; paths?: string[] };
    return: void;
  };
  'git:submodule-remove': {
    args: { repoPath: string; path: string };
    return: void;
  };

  // Shell
  'shell:open-external': { args: { url: string }; return: void };
  'shell:open-in-terminal': { args: { path: string }; return: void };

  // App
  'app:get-recent-repos': { args: void; return: string[] };
  'app:add-recent-repo': { args: { path: string }; return: void };
  'app:get-settings': { args: void; return: Record<string, unknown> };
  'app:set-settings': {
    args: { settings: Record<string, unknown> };
    return: void;
  };
}

// Event channels (main → renderer)
export interface IpcEventMap {
  'git:changed': {
    type: 'status' | 'branches' | 'head' | 'stash' | 'all';
  };
  'git:operation-progress': { operation: string; progress: number };
}

// Helper types
export type IpcChannel = keyof IpcChannelMap;
export type IpcArgs<C extends IpcChannel> = IpcChannelMap[C]['args'];
export type IpcReturn<C extends IpcChannel> = IpcChannelMap[C]['return'];

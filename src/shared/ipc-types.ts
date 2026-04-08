import type {
  CommitNode,
  FileStatus,
  BranchInfo,
  RemoteInfo,
  StashEntry,
  DiffFile,
  RepoInfo,
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
  'git:stage-hunk': {
    args: { repoPath: string; patch: string };
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

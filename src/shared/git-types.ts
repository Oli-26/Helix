export interface CommitNode {
  hash: string;
  abbreviatedHash: string;
  parents: string[];
  refs: string[];
  authorName: string;
  authorEmail: string;
  authorDate: number; // unix timestamp
  subject: string;
  body?: string;
  // Graph layout (assigned by layout algorithm)
  lane?: number;
}

export interface FileStatus {
  path: string;
  index: StatusCode;
  workingDir: StatusCode;
  isStaged: boolean;
}

export type StatusCode =
  | 'M' // modified
  | 'A' // added
  | 'D' // deleted
  | 'R' // renamed
  | 'C' // copied
  | 'U' // unmerged
  | '?' // untracked
  | '!' // ignored
  | ' '; // unmodified

export interface BranchInfo {
  name: string;
  current: boolean;
  commit: string;
  label: string;
  tracking?: string;
  ahead?: number;
  behind?: number;
}

export interface RemoteInfo {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface StashEntry {
  index: number;
  date: string;
  message: string;
  hash: string;
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  hunks: DiffHunk[];
  stats?: { additions: number; deletions: number };
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface RepoInfo {
  path: string;
  name: string;
  currentBranch: string;
  isDetached: boolean;
  hasRemote: boolean;
  state: RepoState;
}

export type RepoState =
  | 'clean'
  | 'merging'
  | 'rebasing'
  | 'cherry-picking'
  | 'reverting'
  | 'bisecting';

export interface GraphEdge {
  fromHash: string;
  toHash: string;
  fromLane: number;
  toLane: number;
  color: string;
}

export interface GraphLayoutResult {
  nodes: Map<string, { lane: number; row: number; color: string }>;
  edges: GraphEdge[];
  maxLane: number;
}

export interface SubmoduleInfo {
  name: string;
  path: string;
  url: string;
  branch?: string;
  currentHash: string;
  expectedHash: string;
  status: SubmoduleStatus;
  dirty: boolean;
  aheadBehind?: { ahead: number; behind: number };
}

export type SubmoduleStatus =
  | 'up-to-date'    // hash matches, clean
  | 'modified'      // hash differs from .gitmodules expectation
  | 'uninitialized' // registered but not cloned
  | 'dirty';        // has uncommitted changes inside

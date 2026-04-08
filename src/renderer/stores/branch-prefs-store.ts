import { create } from 'zustand';

export type BranchSortMode = 'name' | 'date-desc' | 'date-asc';

interface BranchFolder {
  name: string;
  branches: string[]; // branch names
  collapsed: boolean;
}

interface BranchPrefsState {
  // Favourites
  favourites: Set<string>;
  toggleFavourite: (branch: string) => void;
  isFavourite: (branch: string) => boolean;

  // Sorting
  sortMode: BranchSortMode;
  setSortMode: (mode: BranchSortMode) => void;

  // Folders
  folders: BranchFolder[];
  addFolder: (name: string) => void;
  removeFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;
  addBranchToFolder: (folder: string, branch: string) => void;
  removeBranchFromFolder: (folder: string, branch: string) => void;
  toggleFolderCollapse: (name: string) => void;
  getFolderForBranch: (branch: string) => string | null;

  // Filter
  filter: string;
  setFilter: (filter: string) => void;
}

export const useBranchPrefsStore = create<BranchPrefsState>((set, get) => ({
  // Favourites
  favourites: new Set<string>(),
  toggleFavourite: (branch) =>
    set((state) => {
      const next = new Set(state.favourites);
      if (next.has(branch)) {
        next.delete(branch);
      } else {
        next.add(branch);
      }
      return { favourites: next };
    }),
  isFavourite: (branch) => get().favourites.has(branch),

  // Sorting
  sortMode: 'name',
  setSortMode: (mode) => set({ sortMode: mode }),

  // Folders
  folders: [],
  addFolder: (name) =>
    set((state) => ({
      folders: [...state.folders, { name, branches: [], collapsed: false }],
    })),
  removeFolder: (name) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.name !== name),
    })),
  renameFolder: (oldName, newName) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.name === oldName ? { ...f, name: newName } : f,
      ),
    })),
  addBranchToFolder: (folder, branch) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.name === folder && !f.branches.includes(branch)
          ? { ...f, branches: [...f.branches, branch] }
          : f,
      ),
    })),
  removeBranchFromFolder: (folder, branch) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.name === folder
          ? { ...f, branches: f.branches.filter((b) => b !== branch) }
          : f,
      ),
    })),
  toggleFolderCollapse: (name) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.name === name ? { ...f, collapsed: !f.collapsed } : f,
      ),
    })),
  getFolderForBranch: (branch) => {
    const folder = get().folders.find((f) => f.branches.includes(branch));
    return folder?.name ?? null;
  },

  // Filter
  filter: '',
  setFilter: (filter) => set({ filter }),
}));

import { create } from 'zustand';

export type View = 'dashboard' | 'history' | 'staging' | 'branches' | 'remotes' | 'stashes' | 'conflicts' | 'search' | 'submodules';

interface UIState {
  currentView: View;
  setView: (view: View) => void;

  repoPath: string | null;
  setRepoPath: (path: string | null) => void;

  selectedCommit: string | null;
  setSelectedCommit: (hash: string | null) => void;

  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  detailPanelCollapsed: boolean;
  toggleDetailPanel: () => void;

  diffViewMode: 'unified' | 'split';
  setDiffViewMode: (mode: 'unified' | 'split') => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'dashboard',
  setView: (view) => set({ currentView: view }),

  repoPath: null,
  setRepoPath: (path) =>
    set({ repoPath: path, currentView: path ? 'history' : 'dashboard' }),

  selectedCommit: null,
  setSelectedCommit: (hash) => set({ selectedCommit: hash }),

  selectedFile: null,
  setSelectedFile: (path) => set({ selectedFile: path }),

  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  detailPanelCollapsed: false,
  toggleDetailPanel: () =>
    set((state) => ({ detailPanelCollapsed: !state.detailPanelCollapsed })),

  diffViewMode: 'unified',
  setDiffViewMode: (mode) => set({ diffViewMode: mode }),
}));

import { create } from 'zustand';

export type View = 'dashboard' | 'history' | 'staging' | 'branches' | 'remotes' | 'stashes' | 'conflicts' | 'search' | 'submodules';

export interface RepoTab {
  id: string;
  repoPath: string;
  name: string;
  currentView: View;
  selectedCommit: string | null;
  selectedFile: string | null;
}

interface UIState {
  // Tabs
  tabs: RepoTab[];
  activeTabId: string | null;
  addTab: (repoPath: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Per-tab state (operates on active tab)
  setView: (view: View) => void;
  setRepoPath: (path: string | null) => void;
  setSelectedCommit: (hash: string | null) => void;
  setSelectedFile: (path: string | null) => void;

  // Global UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  detailPanelCollapsed: boolean;
  toggleDetailPanel: () => void;
  diffViewMode: 'unified' | 'split';
  setDiffViewMode: (mode: 'unified' | 'split') => void;
}

let tabCounter = 0;

function getRepoName(repoPath: string): string {
  const parts = repoPath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || repoPath;
}

export const useUIStore = create<UIState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (repoPath) => {
    const existing = get().tabs.find((t) => t.repoPath === repoPath);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const id = `tab-${++tabCounter}`;
    const tab: RepoTab = {
      id,
      repoPath,
      name: getRepoName(repoPath),
      currentView: 'history',
      selectedCommit: null,
      selectedFile: null,
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: id,
    }));
  },

  closeTab: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      const next = state.tabs.filter((t) => t.id !== id);
      let nextActive = state.activeTabId;
      if (state.activeTabId === id) {
        if (next.length === 0) {
          nextActive = null;
        } else {
          nextActive = next[Math.min(idx, next.length - 1)].id;
        }
      }
      return { tabs: next, activeTabId: nextActive };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  setView: (view) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, currentView: view } : t,
      ),
    })),

  setRepoPath: (path) => {
    if (path) {
      get().addTab(path);
    } else {
      const active = get().activeTabId;
      if (active) get().closeTab(active);
    }
  },

  setSelectedCommit: (hash) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, selectedCommit: hash } : t,
      ),
    })),

  setSelectedFile: (path) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, selectedFile: path } : t,
      ),
    })),

  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  detailPanelCollapsed: false,
  toggleDetailPanel: () =>
    set((state) => ({ detailPanelCollapsed: !state.detailPanelCollapsed })),

  diffViewMode: 'unified',
  setDiffViewMode: (mode) => set({ diffViewMode: mode }),
}));

// Selectors — derive active tab properties reactively
export const useActiveTab = () =>
  useUIStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

export const useRepoPath = () =>
  useUIStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.repoPath ?? null);

export const useCurrentView = () =>
  useUIStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.currentView ?? 'dashboard');

export const useSelectedCommit = () =>
  useUIStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.selectedCommit ?? null);

export const useSelectedFile = () =>
  useUIStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.selectedFile ?? null);

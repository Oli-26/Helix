import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock document for theme store
vi.stubGlobal('document', {
  documentElement: { setAttribute: vi.fn() },
});

// Import after mocking
import { useUIStore } from '../../src/renderer/stores/ui-store';
import { useBranchPrefsStore } from '../../src/renderer/stores/branch-prefs-store';
import { useThemeStore } from '../../src/renderer/stores/theme-store';

// ─── UI Store ─────────────────────────────────────────────────────

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useUIStore.setState({
      tabs: [],
      activeTabId: null,
      sidebarCollapsed: false,
      detailPanelCollapsed: false,
      diffViewMode: 'unified',
    });
  });

  describe('tab management', () => {
    it('starts with no tabs', () => {
      const state = useUIStore.getState();
      expect(state.tabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
    });

    it('addTab creates a new tab and activates it', () => {
      useUIStore.getState().addTab('/repos/my-project');
      const state = useUIStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].repoPath).toBe('/repos/my-project');
      expect(state.tabs[0].name).toBe('my-project');
      expect(state.tabs[0].currentView).toBe('history');
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('addTab with same repo path activates existing tab', () => {
      useUIStore.getState().addTab('/repos/project');
      useUIStore.getState().addTab('/repos/other');
      useUIStore.getState().addTab('/repos/project'); // duplicate
      const state = useUIStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('closeTab removes tab and activates next', () => {
      const store = useUIStore.getState();
      store.addTab('/repos/a');
      store.addTab('/repos/b');
      const tabB = useUIStore.getState().tabs[1];
      store.closeTab(tabB.id);
      const state = useUIStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].repoPath).toBe('/repos/a');
    });

    it('closeTab last tab sets activeTabId to null', () => {
      useUIStore.getState().addTab('/repos/a');
      const tab = useUIStore.getState().tabs[0];
      useUIStore.getState().closeTab(tab.id);
      expect(useUIStore.getState().tabs).toHaveLength(0);
      expect(useUIStore.getState().activeTabId).toBeNull();
    });

    it('setActiveTab switches active tab', () => {
      useUIStore.getState().addTab('/repos/a');
      useUIStore.getState().addTab('/repos/b');
      const tabA = useUIStore.getState().tabs[0];
      useUIStore.getState().setActiveTab(tabA.id);
      expect(useUIStore.getState().activeTabId).toBe(tabA.id);
    });
  });

  describe('view management', () => {
    it('setView changes the current view for active tab', () => {
      useUIStore.getState().addTab('/repos/test');
      useUIStore.getState().setView('staging');
      const tab = useUIStore.getState().tabs[0];
      expect(tab.currentView).toBe('staging');
    });

    it('setView only changes active tab, not others', () => {
      useUIStore.getState().addTab('/repos/a');
      useUIStore.getState().addTab('/repos/b');
      useUIStore.getState().setView('branches');
      const tabs = useUIStore.getState().tabs;
      expect(tabs[0].currentView).toBe('history'); // unchanged
      expect(tabs[1].currentView).toBe('branches'); // b is active
    });
  });

  describe('selected commit/file', () => {
    it('setSelectedCommit updates active tab', () => {
      useUIStore.getState().addTab('/repos/test');
      useUIStore.getState().setSelectedCommit('abc123');
      expect(useUIStore.getState().tabs[0].selectedCommit).toBe('abc123');
    });

    it('setSelectedCommit to null clears selection', () => {
      useUIStore.getState().addTab('/repos/test');
      useUIStore.getState().setSelectedCommit('abc');
      useUIStore.getState().setSelectedCommit(null);
      expect(useUIStore.getState().tabs[0].selectedCommit).toBeNull();
    });

    it('setSelectedFile updates active tab', () => {
      useUIStore.getState().addTab('/repos/test');
      useUIStore.getState().setSelectedFile('src/main.ts');
      expect(useUIStore.getState().tabs[0].selectedFile).toBe('src/main.ts');
    });
  });

  describe('UI toggles', () => {
    it('toggleSidebar flips sidebarCollapsed', () => {
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it('toggleDetailPanel flips detailPanelCollapsed', () => {
      expect(useUIStore.getState().detailPanelCollapsed).toBe(false);
      useUIStore.getState().toggleDetailPanel();
      expect(useUIStore.getState().detailPanelCollapsed).toBe(true);
    });

    it('setDiffViewMode changes diff view mode', () => {
      useUIStore.getState().setDiffViewMode('split');
      expect(useUIStore.getState().diffViewMode).toBe('split');
      useUIStore.getState().setDiffViewMode('unified');
      expect(useUIStore.getState().diffViewMode).toBe('unified');
    });
  });

  describe('setRepoPath', () => {
    it('opens a new tab when setting a repo path', () => {
      useUIStore.getState().setRepoPath('/repos/new');
      expect(useUIStore.getState().tabs).toHaveLength(1);
    });

    it('closes active tab when setting path to null', () => {
      useUIStore.getState().addTab('/repos/test');
      useUIStore.getState().setRepoPath(null);
      expect(useUIStore.getState().tabs).toHaveLength(0);
    });
  });
});

// ─── Branch Prefs Store ───────────────────────────────────────────

describe('useBranchPrefsStore', () => {
  beforeEach(() => {
    useBranchPrefsStore.setState({
      favourites: new Set<string>(),
      sortMode: 'name',
      folders: [],
      filter: '',
    });
  });

  describe('favourites', () => {
    it('starts with no favourites', () => {
      expect(useBranchPrefsStore.getState().favourites.size).toBe(0);
    });

    it('toggleFavourite adds a branch', () => {
      useBranchPrefsStore.getState().toggleFavourite('main');
      expect(useBranchPrefsStore.getState().isFavourite('main')).toBe(true);
    });

    it('toggleFavourite removes a branch on second call', () => {
      useBranchPrefsStore.getState().toggleFavourite('main');
      useBranchPrefsStore.getState().toggleFavourite('main');
      expect(useBranchPrefsStore.getState().isFavourite('main')).toBe(false);
    });

    it('isFavourite returns false for unknown branch', () => {
      expect(useBranchPrefsStore.getState().isFavourite('nope')).toBe(false);
    });

    it('handles multiple favourites independently', () => {
      const store = useBranchPrefsStore.getState();
      store.toggleFavourite('main');
      store.toggleFavourite('develop');
      expect(useBranchPrefsStore.getState().isFavourite('main')).toBe(true);
      expect(useBranchPrefsStore.getState().isFavourite('develop')).toBe(true);
      store.toggleFavourite('main');
      expect(useBranchPrefsStore.getState().isFavourite('main')).toBe(false);
      expect(useBranchPrefsStore.getState().isFavourite('develop')).toBe(true);
    });
  });

  describe('sorting', () => {
    it('defaults to name sort', () => {
      expect(useBranchPrefsStore.getState().sortMode).toBe('name');
    });

    it('setSortMode changes the sort mode', () => {
      useBranchPrefsStore.getState().setSortMode('date-desc');
      expect(useBranchPrefsStore.getState().sortMode).toBe('date-desc');
    });
  });

  describe('folders', () => {
    it('starts with no folders', () => {
      expect(useBranchPrefsStore.getState().folders).toHaveLength(0);
    });

    it('addFolder creates a new folder', () => {
      useBranchPrefsStore.getState().addFolder('Feature');
      const folders = useBranchPrefsStore.getState().folders;
      expect(folders).toHaveLength(1);
      expect(folders[0].name).toBe('Feature');
      expect(folders[0].branches).toEqual([]);
      expect(folders[0].collapsed).toBe(false);
    });

    it('removeFolder deletes by name', () => {
      useBranchPrefsStore.getState().addFolder('A');
      useBranchPrefsStore.getState().addFolder('B');
      useBranchPrefsStore.getState().removeFolder('A');
      expect(useBranchPrefsStore.getState().folders).toHaveLength(1);
      expect(useBranchPrefsStore.getState().folders[0].name).toBe('B');
    });

    it('renameFolder changes folder name', () => {
      useBranchPrefsStore.getState().addFolder('Old');
      useBranchPrefsStore.getState().renameFolder('Old', 'New');
      expect(useBranchPrefsStore.getState().folders[0].name).toBe('New');
    });

    it('addBranchToFolder adds branch to correct folder', () => {
      useBranchPrefsStore.getState().addFolder('Features');
      useBranchPrefsStore.getState().addBranchToFolder('Features', 'feat-1');
      expect(useBranchPrefsStore.getState().folders[0].branches).toEqual(['feat-1']);
    });

    it('addBranchToFolder does not duplicate', () => {
      useBranchPrefsStore.getState().addFolder('F');
      useBranchPrefsStore.getState().addBranchToFolder('F', 'b1');
      useBranchPrefsStore.getState().addBranchToFolder('F', 'b1');
      expect(useBranchPrefsStore.getState().folders[0].branches).toEqual(['b1']);
    });

    it('removeBranchFromFolder removes branch', () => {
      useBranchPrefsStore.getState().addFolder('F');
      useBranchPrefsStore.getState().addBranchToFolder('F', 'b1');
      useBranchPrefsStore.getState().addBranchToFolder('F', 'b2');
      useBranchPrefsStore.getState().removeBranchFromFolder('F', 'b1');
      expect(useBranchPrefsStore.getState().folders[0].branches).toEqual(['b2']);
    });

    it('toggleFolderCollapse flips collapsed state', () => {
      useBranchPrefsStore.getState().addFolder('F');
      expect(useBranchPrefsStore.getState().folders[0].collapsed).toBe(false);
      useBranchPrefsStore.getState().toggleFolderCollapse('F');
      expect(useBranchPrefsStore.getState().folders[0].collapsed).toBe(true);
      useBranchPrefsStore.getState().toggleFolderCollapse('F');
      expect(useBranchPrefsStore.getState().folders[0].collapsed).toBe(false);
    });

    it('getFolderForBranch finds the containing folder', () => {
      useBranchPrefsStore.getState().addFolder('Bugs');
      useBranchPrefsStore.getState().addBranchToFolder('Bugs', 'fix-123');
      expect(useBranchPrefsStore.getState().getFolderForBranch('fix-123')).toBe('Bugs');
    });

    it('getFolderForBranch returns null for unfoldered branch', () => {
      expect(useBranchPrefsStore.getState().getFolderForBranch('main')).toBeNull();
    });
  });

  describe('filter', () => {
    it('defaults to empty string', () => {
      expect(useBranchPrefsStore.getState().filter).toBe('');
    });

    it('setFilter updates the filter', () => {
      useBranchPrefsStore.getState().setFilter('feat');
      expect(useBranchPrefsStore.getState().filter).toBe('feat');
    });
  });
});

// ─── Theme Store ──────────────────────────────────────────────────

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'dark' });
    vi.mocked(document.documentElement.setAttribute).mockClear();
  });

  it('defaults to dark theme', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme changes theme and sets DOM attribute', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('toggleTheme switches dark to light', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('toggleTheme switches light to dark', () => {
    useThemeStore.setState({ theme: 'light' });
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('double toggle returns to original', () => {
    useThemeStore.getState().toggleTheme();
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});

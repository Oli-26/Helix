import { useEffect, useState } from 'react';
import { Minus, Square, X, GitBranch, Copy, Plus, FolderOpen } from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore, type View, type RepoTab , useRepoPath, useCurrentView } from '../../stores/ui-store';
import { useThemeStore } from '../../stores/theme-store';
import { gitApi } from '../../api/git';
import { appApi } from '../../api/app';
import { motion } from 'framer-motion';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const tabs = useUIStore((s) => s.tabs);
  const activeTabId = useUIStore((s) => s.activeTabId);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const closeTab = useUIStore((s) => s.closeTab);
  const addTab = useUIStore((s) => s.addTab);
  const repoPath = useRepoPath();
  const repoInfo = useRepository(repoPath);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  useEffect(() => {
    window.api.windowIsMaximized().then(setIsMaximized);
    const unsubscribe = window.api.on(
      'window:maximized-changed',
      (maximized: unknown) => setIsMaximized(maximized as boolean),
    );
    return unsubscribe;
  }, []);

  const handleOpenNewRepo = async () => {
    const path = await gitApi.openRepo();
    if (path) {
      await appApi.addRecentRepo(path);
      addTab(path);
    }
  };

  return (
    <div className="bg-secondary border-b border-default flex-shrink-0">
      {/* Top row: repo tabs + window controls */}
      <div
        className="drag-region flex items-center"
        style={{ height: 'var(--titlebar-height)' }}
      >
        {/* App logo */}
        <div className="flex items-center gap-2 px-4 no-drag flex-shrink-0">
          <GitBranch className="w-4 h-4 text-accent" />
          <span className="font-semibold text-sm text-primary">Helix</span>
        </div>

        {/* Repo tabs */}
        <div className="flex-1 flex items-center gap-0 overflow-x-auto no-drag min-w-0 px-1">
          {tabs.map((tab) => (
            <RepoTabButton
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
            />
          ))}

          {/* New tab button */}
          <button
            onClick={handleOpenNewRepo}
            className="flex items-center gap-1 px-2 py-1 ml-1 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors flex-shrink-0"
            title="Open repository in new tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Theme toggle + window controls */}
        <div className="flex items-center no-drag flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-hover rounded-md transition-colors text-secondary hover:text-primary"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          <div className="flex items-center ml-1">
            <button
              onClick={() => window.api.windowMinimize()}
              className="p-2 hover:bg-hover transition-colors text-secondary hover:text-primary"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.api.windowMaximize()}
              className="p-2 hover:bg-hover transition-colors text-secondary hover:text-primary"
            >
              {isMaximized ? (
                <Copy className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => window.api.windowClose()}
              className="p-2 hover:bg-danger hover:text-white transition-colors text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: view navigation (only when a tab is active) */}
      {repoPath && (
        <div className="flex items-center gap-0.5 px-4 h-8 border-t border-subtle bg-primary">
          <NavTab view="history" label="History" />
          <NavTab view="staging" label="Changes" />
          <NavTab view="branches" label="Branches" />
          <NavTab view="remotes" label="Remotes" />
          <NavTab view="search" label="Search" />

          {/* Current branch badge */}
          {repoInfo.data && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="bg-accent-muted text-accent px-2 py-0.5 rounded-md font-medium">
                {repoInfo.data.currentBranch}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RepoTabButton({
  tab,
  isActive,
  onActivate,
  onClose,
}: {
  tab: RepoTab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={`
        relative flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-t-md text-xs max-w-[180px] min-w-[80px] group transition-colors cursor-pointer
        ${isActive
          ? 'bg-primary text-primary border-t border-x border-default -mb-px'
          : 'text-secondary hover:text-primary hover:bg-hover'}
      `}
      onClick={onActivate}
    >
      <FolderOpen className="w-3 h-3 flex-shrink-0 text-accent" />
      <span className="truncate flex-1">{tab.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="p-0.5 rounded hover:bg-hover text-tertiary hover:text-primary transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
      >
        <X className="w-3 h-3" />
      </button>
      {isActive && (
        <motion.div
          layoutId="activeRepoTab"
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full"
        />
      )}
    </div>
  );
}

function NavTab({ view, label }: { view: View; label: string }) {
  const currentView = useCurrentView();
  const setView = useUIStore((s) => s.setView);
  const isActive = currentView === view;

  return (
    <button
      onClick={() => setView(view)}
      className={`
        relative px-2.5 py-1 text-xs rounded transition-colors
        ${isActive ? 'text-primary font-medium' : 'text-secondary hover:text-primary hover:bg-hover'}
      `}
    >
      {label}
      {isActive && (
        <motion.div
          layoutId="activeViewTab"
          className="absolute bottom-0 left-1 right-1 h-0.5 bg-accent rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

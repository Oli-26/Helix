import { useEffect, useState } from 'react';
import { Minus, Square, X, GitBranch, Copy } from 'lucide-react';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore, type View } from '../../stores/ui-store';
import { useThemeStore } from '../../stores/theme-store';
import { motion } from 'framer-motion';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const repoPath = useUIStore((s) => s.repoPath);
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

  return (
    <div
      className="drag-region flex items-center justify-between bg-secondary border-b border-default"
      style={{ height: 'var(--titlebar-height)' }}
    >
      {/* Left: App logo and repo info */}
      <div className="flex items-center gap-3 px-4 no-drag">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-accent" />
          <span className="font-semibold text-sm text-primary">Helix</span>
        </div>
        {repoInfo.data && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm"
          >
            <span className="text-tertiary">/</span>
            <span className="text-secondary">{repoInfo.data.name}</span>
            <span className="bg-accent-muted text-accent px-2 py-0.5 rounded-md text-xs font-medium">
              {repoInfo.data.currentBranch}
            </span>
          </motion.div>
        )}
      </div>

      {/* Center: Navigation tabs */}
      <div className="flex items-center gap-1 no-drag">
        <NavTab view="history" label="History" />
        <NavTab view="staging" label="Changes" />
        <NavTab view="branches" label="Branches" />
        <NavTab view="remotes" label="Remotes" />
        <NavTab view="search" label="Search" />
      </div>

      {/* Right: Theme toggle + window controls */}
      <div className="flex items-center no-drag">
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

        <div className="flex items-center ml-2">
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
  );
}

function NavTab({ view, label }: { view: View; label: string }) {
  const currentView = useUIStore((s) => s.currentView);
  const setView = useUIStore((s) => s.setView);
  const repoPath = useUIStore((s) => s.repoPath);
  const isActive = currentView === view;

  return (
    <button
      onClick={() => setView(view)}
      disabled={!repoPath}
      className={`
        relative px-3 py-1.5 text-sm rounded-md transition-colors
        ${isActive ? 'text-primary' : 'text-secondary hover:text-primary'}
        ${!repoPath ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover'}
      `}
    >
      {label}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-1 right-1 h-0.5 bg-accent rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

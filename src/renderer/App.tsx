import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer } from './components/ui/Toast';
import { useThemeStore } from './stores/theme-store';
import { useUIStore , useRepoPath } from './stores/ui-store';
import { useGitWatcher } from './hooks/useGitWatcher';

export function App() {
  const theme = useThemeStore((s) => s.theme);
  const setView = useUIStore((s) => s.setView);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const repoPath = useRepoPath();
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const diffViewMode = useUIStore((s) => s.diffViewMode);

  // Set initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!repoPath) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === '1') {
        e.preventDefault();
        setView('history');
      } else if (mod && e.key === '2') {
        e.preventDefault();
        setView('staging');
      } else if (mod && e.key === '3') {
        e.preventDefault();
        setView('branches');
      } else if (mod && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (mod && e.key === 'd') {
        e.preventDefault();
        setDiffViewMode(diffViewMode === 'unified' ? 'split' : 'unified');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [repoPath, setView, toggleSidebar, setDiffViewMode, diffViewMode]);

  // Listen for git file changes
  useGitWatcher();

  return (
    <>
      <AppLayout />
      <CommandPalette />
      <ToastContainer />
    </>
  );
}

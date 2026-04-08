import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  GitBranch,
  GitCommit,
  Upload,
  Download,
  RefreshCw,
  Archive,
  Search,
  Sun,
  Moon,
  Columns2,
  Rows3,
  History,
  FileEdit,
  Sidebar,
} from 'lucide-react';
import { useUIStore } from '../stores/ui-store';
import { useThemeStore } from '../stores/theme-store';
import { useBranches } from '../hooks/useBranches';
import { gitApi } from '../api/git';
import { useQueryClient } from '@tanstack/react-query';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const repoPath = useUIStore((s) => s.repoPath);
  const setView = useUIStore((s) => s.setView);
  const setRepoPath = useUIStore((s) => s.setRepoPath);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const branches = useBranches(repoPath);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCheckout = async (branch: string) => {
    if (!repoPath) return;
    await gitApi.checkout(repoPath, branch);
    queryClient.invalidateQueries({ queryKey: ['git'] });
    setOpen(false);
  };

  const handleOpenRepo = async () => {
    const path = await gitApi.openRepo();
    if (path) {
      setRepoPath(path);
    }
    setOpen(false);
  };

  const handlePush = async () => {
    if (!repoPath) return;
    await gitApi.push(repoPath);
    setOpen(false);
  };

  const handlePull = async () => {
    if (!repoPath) return;
    await gitApi.pull(repoPath);
    queryClient.invalidateQueries({ queryKey: ['git'] });
    setOpen(false);
  };

  const handleFetch = async () => {
    if (!repoPath) return;
    await gitApi.fetch(repoPath);
    queryClient.invalidateQueries({ queryKey: ['git'] });
    setOpen(false);
  };

  const handleStash = async () => {
    if (!repoPath) return;
    await gitApi.stashSave(repoPath);
    queryClient.invalidateQueries({ queryKey: ['git'] });
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setOpen(false)}
          />

          {/* Command dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[560px] z-50"
          >
            <Command
              className="rounded-xl border border-default bg-secondary shadow-lg overflow-hidden"
              loop
            >
              <Command.Input
                placeholder="Type a command or search..."
                className="w-full px-4 py-3 text-sm bg-transparent text-primary placeholder:text-placeholder border-b border-default focus:outline-none"
                autoFocus
              />
              <Command.List className="max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-6 text-sm text-tertiary text-center">
                  No results found.
                </Command.Empty>

                {/* Navigation */}
                <Command.Group
                  heading="Navigation"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                >
                  <PaletteItem
                    icon={<History className="w-4 h-4" />}
                    label="Go to History"
                    shortcut="Ctrl+1"
                    onSelect={() => {
                      setView('history');
                      setOpen(false);
                    }}
                  />
                  <PaletteItem
                    icon={<FileEdit className="w-4 h-4" />}
                    label="Go to Changes"
                    shortcut="Ctrl+2"
                    onSelect={() => {
                      setView('staging');
                      setOpen(false);
                    }}
                  />
                  <PaletteItem
                    icon={<GitBranch className="w-4 h-4" />}
                    label="Go to Branches"
                    shortcut="Ctrl+3"
                    onSelect={() => {
                      setView('branches');
                      setOpen(false);
                    }}
                  />
                  <PaletteItem
                    icon={<Sidebar className="w-4 h-4" />}
                    label="Toggle Sidebar"
                    shortcut="Ctrl+B"
                    onSelect={() => {
                      toggleSidebar();
                      setOpen(false);
                    }}
                  />
                </Command.Group>

                {/* Actions */}
                <Command.Group
                  heading="Actions"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                >
                  <PaletteItem
                    icon={<FolderOpen className="w-4 h-4" />}
                    label="Open Repository..."
                    onSelect={handleOpenRepo}
                  />
                  {repoPath && (
                    <>
                      <PaletteItem
                        icon={<Upload className="w-4 h-4" />}
                        label="Push"
                        onSelect={handlePush}
                      />
                      <PaletteItem
                        icon={<Download className="w-4 h-4" />}
                        label="Pull"
                        onSelect={handlePull}
                      />
                      <PaletteItem
                        icon={<RefreshCw className="w-4 h-4" />}
                        label="Fetch All"
                        onSelect={handleFetch}
                      />
                      <PaletteItem
                        icon={<Archive className="w-4 h-4" />}
                        label="Stash Changes"
                        onSelect={handleStash}
                      />
                    </>
                  )}
                </Command.Group>

                {/* Appearance */}
                <Command.Group
                  heading="Appearance"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                >
                  <PaletteItem
                    icon={
                      theme === 'dark' ? (
                        <Sun className="w-4 h-4" />
                      ) : (
                        <Moon className="w-4 h-4" />
                      )
                    }
                    label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
                    onSelect={() => {
                      toggleTheme();
                      setOpen(false);
                    }}
                  />
                  <PaletteItem
                    icon={
                      diffViewMode === 'unified' ? (
                        <Columns2 className="w-4 h-4" />
                      ) : (
                        <Rows3 className="w-4 h-4" />
                      )
                    }
                    label={`Switch to ${diffViewMode === 'unified' ? 'Split' : 'Unified'} Diff`}
                    shortcut="Ctrl+D"
                    onSelect={() => {
                      setDiffViewMode(
                        diffViewMode === 'unified' ? 'split' : 'unified',
                      );
                      setOpen(false);
                    }}
                  />
                </Command.Group>

                {/* Branch checkout */}
                {repoPath && branches.data && (
                  <Command.Group
                    heading="Checkout Branch"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                  >
                    {branches.data.local
                      .filter((b) => !b.current)
                      .map((branch) => (
                        <PaletteItem
                          key={branch.name}
                          icon={<GitCommit className="w-4 h-4" />}
                          label={branch.name}
                          onSelect={() => handleCheckout(branch.name)}
                        />
                      ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="flex items-center justify-between px-4 py-2 border-t border-default text-[10px] text-tertiary">
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-tertiary text-secondary">
                    ↑↓
                  </kbd>{' '}
                  navigate{' '}
                  <kbd className="px-1 py-0.5 rounded bg-tertiary text-secondary ml-2">
                    ↵
                  </kbd>{' '}
                  select{' '}
                  <kbd className="px-1 py-0.5 rounded bg-tertiary text-secondary ml-2">
                    esc
                  </kbd>{' '}
                  close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PaletteItem({
  icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer text-secondary data-[selected=true]:bg-hover data-[selected=true]:text-primary transition-colors"
    >
      <span className="text-tertiary">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary text-tertiary">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}

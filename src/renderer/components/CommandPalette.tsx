import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, GitBranch, GitCommit, Upload, Download, RefreshCw,
  Archive, Search, Sun, Moon, Columns2, Rows3, History, FileEdit,
  Sidebar, Tag, FileSearch, Settings, Undo2, BarChart3, Orbit,
} from 'lucide-react';
import { useUIStore, useRepoPath } from '../stores/ui-store';
import { useThemeStore } from '../stores/theme-store';
import { useBranches } from '../hooks/useBranches';
import { gitApi } from '../api/git';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from './ui/Toast';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const repoPath = useRepoPath();
  const setView = useUIStore((s) => s.setView);
  const addTab = useUIStore((s) => s.addTab);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const branches = useBranches(repoPath);
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['git', 'tags', repoPath],
    queryFn: () => gitApi.getTags(repoPath!),
    enabled: !!repoPath && open,
    staleTime: 10_000,
  });

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

  const run = (fn: () => void | Promise<void>) => {
    setOpen(false);
    fn();
  };

  const handleCheckout = async (branch: string) => {
    if (!repoPath) return;
    try {
      await gitApi.checkout(repoPath, branch);
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Checked out', branch);
    } catch (err: any) {
      toast.error('Checkout failed', err.message);
    }
  };

  const handleOpenRepo = async () => {
    const path = await gitApi.openRepo();
    if (path) addTab(path);
  };

  const handleCreateBranch = async () => {
    const name = window.prompt('New branch name:');
    if (!name?.trim() || !repoPath) return;
    try {
      await gitApi.createBranch(repoPath, name.trim());
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Branch created', name.trim());
    } catch (err: any) {
      toast.error('Create branch failed', err.message);
    }
  };

  const handleCreateTag = async () => {
    const name = window.prompt('New tag name:');
    if (!name?.trim() || !repoPath) return;
    const message = window.prompt('Tag message (leave empty for lightweight tag):');
    try {
      await gitApi.createTag(repoPath, name.trim(), undefined, message?.trim() || undefined, !!message?.trim());
      queryClient.invalidateQueries({ queryKey: ['git', 'tags'] });
      toast.success('Tag created', name.trim());
    } catch (err: any) {
      toast.error('Create tag failed', err.message);
    }
  };

  const groupClass = '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ duration: 0.15 }} className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[560px] z-50">
            <Command className="rounded-xl border border-default bg-secondary shadow-lg overflow-hidden" loop>
              <Command.Input placeholder="Type a command or search..." className="w-full px-4 py-3 text-sm bg-transparent text-primary placeholder:text-placeholder border-b border-default focus:outline-none" autoFocus />
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-6 text-sm text-tertiary text-center">No results found.</Command.Empty>

                {/* Navigation */}
                <Command.Group heading="Navigation" className={groupClass}>
                  <PaletteItem icon={<History className="w-4 h-4" />} label="Go to History" shortcut="Ctrl+1" onSelect={() => run(() => setView('history'))} />
                  <PaletteItem icon={<FileEdit className="w-4 h-4" />} label="Go to Changes" shortcut="Ctrl+2" onSelect={() => run(() => setView('staging'))} />
                  <PaletteItem icon={<GitBranch className="w-4 h-4" />} label="Go to Branches" shortcut="Ctrl+3" onSelect={() => run(() => setView('branches'))} />
                  <PaletteItem icon={<FileSearch className="w-4 h-4" />} label="Go to Blame" onSelect={() => run(() => setView('blame'))} />
                  <PaletteItem icon={<Search className="w-4 h-4" />} label="Go to Search" onSelect={() => run(() => setView('search'))} />
                  <PaletteItem icon={<BarChart3 className="w-4 h-4" />} label="Go to Stats" onSelect={() => run(() => setView('stats'))} />
                  <PaletteItem icon={<Orbit className="w-4 h-4" />} label="Go to Constellation" onSelect={() => run(() => setView('constellation'))} />
                  <PaletteItem icon={<Settings className="w-4 h-4" />} label="Go to Settings" onSelect={() => run(() => setView('settings'))} />
                  <PaletteItem icon={<Sidebar className="w-4 h-4" />} label="Toggle Sidebar" shortcut="Ctrl+B" onSelect={() => run(() => toggleSidebar())} />
                </Command.Group>

                {/* Actions */}
                <Command.Group heading="Actions" className={groupClass}>
                  <PaletteItem icon={<FolderOpen className="w-4 h-4" />} label="Open Repository..." onSelect={() => run(handleOpenRepo)} />
                  {repoPath && (
                    <>
                      <PaletteItem icon={<Upload className="w-4 h-4" />} label="Push" onSelect={() => run(async () => {
                        try { await gitApi.push(repoPath); toast.success('Push complete'); } catch (err: any) { toast.error('Push failed', err.message); }
                      })} />
                      <PaletteItem icon={<Download className="w-4 h-4" />} label="Pull" onSelect={() => run(async () => {
                        try { await gitApi.pull(repoPath); queryClient.invalidateQueries({ queryKey: ['git'] }); toast.success('Pull complete'); } catch (err: any) { toast.error('Pull failed', err.message); }
                      })} />
                      <PaletteItem icon={<RefreshCw className="w-4 h-4" />} label="Fetch All" onSelect={() => run(async () => {
                        try { await gitApi.fetch(repoPath); queryClient.invalidateQueries({ queryKey: ['git'] }); toast.success('Fetch complete'); } catch (err: any) { toast.error('Fetch failed', err.message); }
                      })} />
                      <PaletteItem icon={<Archive className="w-4 h-4" />} label="Stash Changes" onSelect={() => run(async () => {
                        try { await gitApi.stashSave(repoPath); queryClient.invalidateQueries({ queryKey: ['git'] }); toast.success('Changes stashed'); } catch (err: any) { toast.error('Stash failed', err.message); }
                      })} />
                      <PaletteItem icon={<Undo2 className="w-4 h-4" />} label="Pop Stash" onSelect={() => run(async () => {
                        try { await gitApi.stashPop(repoPath, 0); queryClient.invalidateQueries({ queryKey: ['git'] }); toast.success('Stash popped'); } catch (err: any) { toast.error('Pop failed', err.message); }
                      })} />
                      <PaletteItem icon={<GitBranch className="w-4 h-4" />} label="Create Branch..." onSelect={() => run(handleCreateBranch)} />
                      <PaletteItem icon={<Tag className="w-4 h-4" />} label="Create Tag..." onSelect={() => run(handleCreateTag)} />
                    </>
                  )}
                </Command.Group>

                {/* Appearance */}
                <Command.Group heading="Appearance" className={groupClass}>
                  <PaletteItem icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`} onSelect={() => run(() => toggleTheme())} />
                  <PaletteItem icon={diffViewMode === 'unified' ? <Columns2 className="w-4 h-4" /> : <Rows3 className="w-4 h-4" />} label={`Switch to ${diffViewMode === 'unified' ? 'Split' : 'Unified'} Diff`} shortcut="Ctrl+D" onSelect={() => run(() => setDiffViewMode(diffViewMode === 'unified' ? 'split' : 'unified'))} />
                </Command.Group>

                {/* Branch checkout */}
                {repoPath && branches.data && (
                  <Command.Group heading="Checkout Branch" className={groupClass}>
                    {branches.data.local.filter((b) => !b.current).map((branch) => (
                      <PaletteItem key={branch.name} icon={<GitCommit className="w-4 h-4" />} label={branch.name} onSelect={() => run(() => handleCheckout(branch.name))} />
                    ))}
                  </Command.Group>
                )}

                {/* Tags */}
                {repoPath && tagsQuery.data && tagsQuery.data.length > 0 && (
                  <Command.Group heading="Tags" className={groupClass}>
                    {tagsQuery.data.slice(0, 20).map((tag) => (
                      <PaletteItem key={tag.name} icon={<Tag className="w-4 h-4" />} label={tag.name} onSelect={() => run(async () => {
                        try { await gitApi.checkout(repoPath, tag.name); queryClient.invalidateQueries({ queryKey: ['git'] }); toast.success('Checked out tag', tag.name); } catch (err: any) { toast.error('Checkout failed', err.message); }
                      })} />
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="flex items-center justify-between px-4 py-2 border-t border-default text-[10px] text-tertiary">
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-tertiary text-secondary">↑↓</kbd> navigate{' '}
                  <kbd className="px-1 py-0.5 rounded bg-tertiary text-secondary ml-2">↵</kbd> select{' '}
                  <kbd className="px-1 py-0.5 rounded bg-tertiary text-secondary ml-2">esc</kbd> close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PaletteItem({ icon, label, shortcut, onSelect }: {
  icon: React.ReactNode; label: string; shortcut?: string; onSelect: () => void;
}) {
  return (
    <Command.Item onSelect={onSelect} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer text-secondary data-[selected=true]:bg-hover data-[selected=true]:text-primary transition-colors">
      <span className="text-tertiary">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary text-tertiary">{shortcut}</kbd>}
    </Command.Item>
  );
}

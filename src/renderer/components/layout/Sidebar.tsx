import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, GitCommit, Globe, Tag, Archive, ChevronRight,
  History, FileEdit, Upload, Search, AlertTriangle, FolderGit2,
  Star, ArrowUpDown, Folder, FolderPlus, X, SortAsc, Clock,
  SortDesc, Trash2, CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useBranches } from '../../hooks/useBranches';
import { useRepository } from '../../hooks/useRepository';
import { useStatus } from '../../hooks/useStatus';
import { useUIStore, type View, useRepoPath, useCurrentView } from '../../stores/ui-store';
import { useBranchPrefsStore, type BranchSortMode } from '../../stores/branch-prefs-store';
import { gitApi } from '../../api/git';
import { useQueryClient } from '@tanstack/react-query';
import { ContextMenu } from '../ui/ContextMenu';
import { ConfirmModal } from '../ui/ConfirmModal';
import { toast } from '../ui/Toast';
import type { BranchInfo } from '../../../shared/git-types';

export function Sidebar() {
  const repoPath = useRepoPath();
  const currentView = useCurrentView();
  const setView = useUIStore((s) => s.setView);
  const branches = useBranches(repoPath);
  const { data: repo } = useRepository(repoPath);
  const { data: status } = useStatus(repoPath);
  const queryClient = useQueryClient();

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    danger?: boolean;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const closeModal = () => setConfirmModal((s) => ({ ...s, open: false }));

  const isDirty = (status?.length || 0) > 0;

  const isInConflict =
    repo?.state === 'merging' || repo?.state === 'rebasing' || repo?.state === 'cherry-picking';

  const handleCheckout = async (branch: string) => {
    if (!repoPath) return;
    const doCheckout = async () => {
      try {
        await gitApi.checkout(repoPath, branch);
        queryClient.invalidateQueries({ queryKey: ['git'] });
        toast.success('Checked out', branch);
      } catch (err: any) {
        toast.error('Checkout failed', err.message);
      }
    };

    if (isDirty) {
      setConfirmModal({
        open: true,
        title: 'Uncommitted changes',
        message: `You have ${status!.length} uncommitted change${status!.length > 1 ? 's' : ''}. Switching to "${branch}" may overwrite them. Continue?`,
        confirmLabel: 'Switch anyway',
        onConfirm: () => {
          closeModal();
          doCheckout();
        },
      });
    } else {
      doCheckout();
    }
  };

  const handleDeleteBranches = async (names: string[]) => {
    if (!repoPath) return;
    const doDelete = async () => {
      for (const name of names) {
        try {
          await gitApi.deleteBranch(repoPath, name);
        } catch (err: any) {
          toast.error(`Failed to delete ${name}`, err.message);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success(`Deleted ${names.length} branch${names.length > 1 ? 'es' : ''}`, names.join(', '));
    };

    setConfirmModal({
      open: true,
      title: `Delete ${names.length} branch${names.length > 1 ? 'es' : ''}?`,
      message: names.length === 1
        ? `Are you sure you want to delete "${names[0]}"? This cannot be undone.`
        : `Are you sure you want to delete these branches?\n${names.join(', ')}`,
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: () => {
        closeModal();
        doDelete();
      },
    });
  };

  return (
    <div className="h-full bg-secondary flex flex-col border-r border-default overflow-hidden">
      <div className="px-2 py-3 border-b border-default flex-shrink-0">
        <NavItem icon={<History className="w-4 h-4" />} label="History" active={currentView === 'history'} onClick={() => setView('history')} />
        <NavItem icon={<FileEdit className="w-4 h-4" />} label="Changes" active={currentView === 'staging'} onClick={() => setView('staging')} />
        <NavItem icon={<Upload className="w-4 h-4" />} label="Remotes" active={currentView === 'remotes'} onClick={() => setView('remotes')} />
        <NavItem icon={<FolderGit2 className="w-4 h-4" />} label="Submodules" active={currentView === 'submodules'} onClick={() => setView('submodules')} />
        <NavItem icon={<Search className="w-4 h-4" />} label="Search" active={currentView === 'search'} onClick={() => setView('search')} shortcut="Ctrl+K" />
        {isInConflict && (
          <NavItem icon={<AlertTriangle className="w-4 h-4" />} label="Conflicts" active={currentView === 'conflicts'} onClick={() => setView('conflicts')} badge="!" badgeColor="warning" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <BranchSection
          localBranches={branches.data?.local || []}
          onCheckout={handleCheckout}
          onDelete={handleDeleteBranches}
        />

        <CollapsibleSection icon={<Globe className="w-4 h-4" />} title="Remotes" count={branches.data?.remote.length}>
          {branches.data?.remote.map((branch) => (
            <BranchRow key={branch.name} branch={branch} isSelected={false} onSelect={() => {}} selectedNames={[]} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection icon={<Tag className="w-4 h-4" />} title="Tags" count={0}>
          <div className="px-3 py-2 text-xs text-tertiary">No tags</div>
        </CollapsibleSection>

        <CollapsibleSection icon={<Archive className="w-4 h-4" />} title="Stashes" count={0}>
          <button onClick={() => setView('stashes')} className="w-full px-3 py-2 text-xs text-accent hover:text-accent-hover text-left">
            Manage stashes...
          </button>
        </CollapsibleSection>
      </div>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        danger={confirmModal.danger}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeModal}
      />
    </div>
  );
}

// ─── Branch Section ─────────────────────────────────────────────────

function BranchSection({
  localBranches,
  onCheckout,
  onDelete,
}: {
  localBranches: BranchInfo[];
  onCheckout: (name: string) => void;
  onDelete: (names: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  const filter = useBranchPrefsStore((s) => s.filter);
  const setFilter = useBranchPrefsStore((s) => s.setFilter);
  const sortMode = useBranchPrefsStore((s) => s.sortMode);
  const setSortMode = useBranchPrefsStore((s) => s.setSortMode);
  const favourites = useBranchPrefsStore((s) => s.favourites);
  const folders = useBranchPrefsStore((s) => s.folders);
  const addFolder = useBranchPrefsStore((s) => s.addFolder);

  const filtered = useMemo(() => {
    let list = localBranches;
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return list;
  }, [localBranches, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortMode) {
      case 'date-desc': return arr.sort((a, b) => (b.lastCommitDate || 0) - (a.lastCommitDate || 0));
      case 'date-asc': return arr.sort((a, b) => (a.lastCommitDate || 0) - (b.lastCommitDate || 0));
      default: return arr.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filtered, sortMode]);

  const allVisibleNames = useMemo(() => sorted.map((b) => b.name), [sorted]);

  const handleSelect = useCallback(
    (name: string, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedRef.current) {
        const startIdx = allVisibleNames.indexOf(lastClickedRef.current);
        const endIdx = allVisibleNames.indexOf(name);
        if (startIdx >= 0 && endIdx >= 0) {
          const from = Math.min(startIdx, endIdx);
          const to = Math.max(startIdx, endIdx);
          const range = allVisibleNames.slice(from, to + 1);
          setSelected((prev) => {
            const next = new Set(prev);
            range.forEach((n) => next.add(n));
            return next;
          });
        }
      } else if (e.ctrlKey || e.metaKey) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(name)) next.delete(name);
          else next.add(name);
          return next;
        });
      } else {
        setSelected(new Set([name]));
      }
      lastClickedRef.current = name;
    },
    [allVisibleNames],
  );

  const clearSelection = () => setSelected(new Set());

  const selectedNames = [...selected].filter((n) => allVisibleNames.includes(n));
  const deletableSelected = selectedNames.filter(
    (n) => !localBranches.find((b) => b.name === n)?.current,
  );

  const favBranches = sorted.filter((b) => favourites.has(b.name));
  const folderedNames = new Set(folders.flatMap((f) => f.branches));
  const unfiled = sorted.filter((b) => !favourites.has(b.name) && !folderedNames.has(b.name));

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName('');
      setCreatingFolder(false);
    }
  };

  const sortLabels: Record<BranchSortMode, { icon: React.ReactNode; label: string }> = {
    name: { icon: <SortAsc className="w-3 h-3" />, label: 'Name' },
    'date-desc': { icon: <Clock className="w-3 h-3" />, label: 'Newest' },
    'date-asc': { icon: <SortDesc className="w-3 h-3" />, label: 'Oldest' },
  };

  return (
    <div className="mb-1">
      <div className="flex items-center gap-1 px-3 py-1.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary hover:text-primary transition-colors flex-1 text-left"
        >
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight className="w-3 h-3" />
          </motion.div>
          <GitBranch className="w-4 h-4" />
          <span>Branches</span>
          <span className="text-tertiary font-normal">{localBranches.length}</span>
        </button>
        <div className="relative">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="p-1 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors" title={`Sort: ${sortLabels[sortMode].label}`}>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showSortMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-6 z-50 bg-secondary border border-default rounded-lg shadow-lg py-1 min-w-[130px]">
                {(Object.keys(sortLabels) as BranchSortMode[]).map((mode) => (
                  <button key={mode} onClick={() => { setSortMode(mode); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${sortMode === mode ? 'text-accent bg-accent-muted' : 'text-secondary hover:text-primary hover:bg-hover'}`}>
                    {sortLabels[mode].icon}
                    {sortLabels[mode].label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => setCreatingFolder(!creatingFolder)} className="p-1 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors" title="Create folder">
          <FolderPlus className="w-3 h-3" />
        </button>
      </div>

      {/* Multi-select bar */}
      <AnimatePresence>
        {selectedNames.length > 1 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-muted border-y border-default">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs text-accent font-medium flex-1">{selectedNames.length} selected</span>
              {deletableSelected.length > 0 && (
                <button onClick={() => { onDelete(deletableSelected); clearSelection(); }} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-danger-muted text-danger hover:bg-danger hover:text-white transition-colors">
                  <Trash2 className="w-3 h-3" />
                  Delete ({deletableSelected.length})
                </button>
              )}
              <button onClick={clearSelection} className="p-0.5 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {localBranches.length > 10 && (
              <div className="px-3 pb-1.5">
                <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter branches..." className="w-full bg-input border border-default rounded px-2 py-1 text-xs text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors" />
              </div>
            )}

            <AnimatePresence>
              {creatingFolder && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-3 pb-1.5">
                  <div className="flex gap-1">
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name..." className="flex-1 bg-input border border-default rounded px-2 py-1 text-xs text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setCreatingFolder(false); }} />
                    <button onClick={handleCreateFolder} className="px-2 py-1 bg-accent text-text-inverse rounded text-xs hover:bg-accent-hover transition-colors">Add</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {favBranches.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
                  <Star className="w-3 h-3 fill-current" /> Favourites
                </div>
                {favBranches.map((b) => (
                  <BranchRow key={b.name} branch={b} isSelected={selected.has(b.name)} onSelect={(e) => handleSelect(b.name, e)} onCheckout={() => onCheckout(b.name)} onDelete={onDelete} showDate={sortMode !== 'name'} selectedNames={selectedNames} />
                ))}
              </div>
            )}

            {folders.map((folder) => {
              const fb = sorted.filter((b) => folder.branches.includes(b.name));
              if (filter && fb.length === 0) return null;
              return <BranchFolder key={folder.name} folder={folder} branches={fb} selected={selected} onSelect={handleSelect} onCheckout={onCheckout} onDelete={onDelete} showDate={sortMode !== 'name'} selectedNames={selectedNames} />;
            })}

            {unfiled.map((b) => (
              <BranchRow key={b.name} branch={b} isSelected={selected.has(b.name)} onSelect={(e) => handleSelect(b.name, e)} onCheckout={() => onCheckout(b.name)} onDelete={onDelete} showDate={sortMode !== 'name'} selectedNames={selectedNames} />
            ))}

            {sorted.length === 0 && filter && (
              <div className="px-3 py-3 text-xs text-tertiary text-center">No branches matching "{filter}"</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Branch Folder ──────────────────────────────────────────────────

function BranchFolder({ folder, branches, selected, onSelect, onCheckout, onDelete, showDate, selectedNames }: {
  folder: { name: string; branches: string[]; collapsed: boolean };
  branches: BranchInfo[];
  selected: Set<string>;
  onSelect: (name: string, e: React.MouseEvent) => void;
  onCheckout: (name: string) => void;
  onDelete: (names: string[]) => void;
  showDate: boolean;
  selectedNames: string[];
}) {
  const toggleCollapse = useBranchPrefsStore((s) => s.toggleFolderCollapse);
  const removeFolder = useBranchPrefsStore((s) => s.removeFolder);

  return (
    <div className="mb-0.5">
      <ContextMenu items={[{ label: 'Remove Folder', icon: <X className="w-4 h-4" />, danger: true, onClick: () => removeFolder(folder.name) }]}>
        <button onClick={() => toggleCollapse(folder.name)} className="w-full flex items-center gap-1.5 px-3 py-1 text-xs text-secondary hover:text-primary hover:bg-hover transition-colors">
          <motion.div animate={{ rotate: folder.collapsed ? 0 : 90 }} transition={{ duration: 0.15 }}><ChevronRight className="w-3 h-3" /></motion.div>
          <Folder className="w-3 h-3 text-accent" />
          <span className="font-medium">{folder.name}</span>
          <span className="text-tertiary ml-auto">{branches.length}</span>
        </button>
      </ContextMenu>
      <AnimatePresence initial={false}>
        {!folder.collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden pl-3">
            {branches.map((b) => (
              <BranchRow key={b.name} branch={b} isSelected={selected.has(b.name)} onSelect={(e) => onSelect(b.name, e)} onCheckout={() => onCheckout(b.name)} onDelete={onDelete} showDate={showDate} selectedNames={selectedNames} />
            ))}
            {branches.length === 0 && <div className="px-3 py-2 text-[10px] text-tertiary">Drag branches here</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Single Branch Row ──────────────────────────────────────────────

function BranchRow({ branch, isSelected, onSelect, onCheckout, onDelete, showDate = false, selectedNames }: {
  branch: BranchInfo;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onCheckout?: () => void;
  onDelete?: (names: string[]) => void;
  showDate?: boolean;
  selectedNames: string[];
}) {
  const toggleFavourite = useBranchPrefsStore((s) => s.toggleFavourite);
  const isFav = useBranchPrefsStore((s) => s.favourites.has(branch.name));
  const folders = useBranchPrefsStore((s) => s.folders);
  const addBranchToFolder = useBranchPrefsStore((s) => s.addBranchToFolder);
  const removeBranchFromFolder = useBranchPrefsStore((s) => s.removeBranchFromFolder);
  const getFolderForBranch = useBranchPrefsStore((s) => s.getFolderForBranch);

  const currentFolder = getFolderForBranch(branch.name);

  // When multiple selected, folder actions apply to all selected
  const targetNames = selectedNames.length > 1 && isSelected ? selectedNames : [branch.name];

  const contextItems = [
    ...(onCheckout && !branch.current
      ? [{ label: 'Checkout', icon: <GitCommit className="w-4 h-4" />, onClick: onCheckout }]
      : []),
    {
      label: isFav ? 'Remove from Favourites' : 'Add to Favourites',
      icon: <Star className={`w-4 h-4 ${isFav ? 'fill-current text-warning' : ''}`} />,
      onClick: () => {
        for (const n of targetNames) toggleFavourite(n);
      },
    },
    ...(folders.length > 0
      ? [
          { separator: true, label: '' },
          ...folders.map((f) => ({
            label: `Move${targetNames.length > 1 ? ` ${targetNames.length}` : ''} to ${f.name}`,
            icon: <Folder className="w-4 h-4" />,
            onClick: () => {
              for (const n of targetNames) {
                const cf = getFolderForBranch(n);
                if (cf) removeBranchFromFolder(cf, n);
                addBranchToFolder(f.name, n);
              }
            },
          })),
        ]
      : []),
    ...(onDelete && !branch.current
      ? [
          { separator: true, label: '' },
          {
            label: targetNames.length > 1 ? `Delete ${targetNames.length} branches` : 'Delete Branch',
            icon: <Trash2 className="w-4 h-4" />,
            danger: true,
            onClick: () => {
              const deletable = targetNames.filter((n) => n !== branch.name || !branch.current);
              if (deletable.length > 0) onDelete(deletable);
            },
          },
        ]
      : []),
  ];

  const timeAgo = branch.lastCommitDate
    ? formatDistanceToNow(new Date(branch.lastCommitDate * 1000), { addSuffix: true })
    : null;

  return (
    <ContextMenu items={contextItems}>
      <div
        onClick={(e) => onSelect(e)}
        onDoubleClick={() => {
          if (!branch.current) onCheckout?.();
        }}
        className={`
          w-full flex items-center gap-2 px-3 py-1 text-sm transition-colors group cursor-pointer
          ${branch.current
            ? 'text-accent bg-accent-muted'
            : isSelected
              ? 'text-primary bg-accent/10 ring-1 ring-inset ring-accent/30'
              : 'text-secondary hover:text-primary hover:bg-hover'}
        `}
      >
        <GitCommit className="w-3 h-3 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate">{branch.name}</div>
          {showDate && timeAgo && <div className="text-[10px] text-tertiary truncate">{timeAgo}</div>}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); toggleFavourite(branch.name); }}
          className={`p-0.5 rounded transition-all flex-shrink-0 ${isFav ? 'text-warning opacity-100' : 'text-tertiary opacity-0 group-hover:opacity-100 hover:text-warning'}`}
        >
          <Star className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
        </button>

        {(branch.ahead || branch.behind) && (
          <span className="flex items-center gap-1 text-xs text-tertiary flex-shrink-0">
            {branch.ahead ? <span className="text-success">+{branch.ahead}</span> : null}
            {branch.behind ? <span className="text-danger">-{branch.behind}</span> : null}
          </span>
        )}
      </div>
    </ContextMenu>
  );
}

// ─── Reusable ───────────────────────────────────────────────────────

function NavItem({ icon, label, active, onClick, shortcut, badge, badgeColor }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
  shortcut?: string; badge?: string; badgeColor?: 'warning' | 'danger' | 'accent';
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors mb-0.5 ${active ? 'bg-accent-muted text-accent font-medium' : 'text-secondary hover:text-primary hover:bg-hover'}`}>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-text-inverse ${badgeColor === 'warning' ? 'bg-warning' : badgeColor === 'danger' ? 'bg-danger' : 'bg-accent'}`}>{badge}</span>}
      {shortcut && <kbd className="text-[10px] px-1 py-0.5 rounded bg-tertiary text-tertiary">{shortcut}</kbd>}
    </button>
  );
}

function CollapsibleSection({ icon, title, count, defaultOpen = false, children }: {
  icon: React.ReactNode; title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary hover:text-primary hover:bg-hover transition-colors">
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }}><ChevronRight className="w-3 h-3" /></motion.div>
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {count !== undefined && <span className="text-tertiary font-normal">{count}</span>}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

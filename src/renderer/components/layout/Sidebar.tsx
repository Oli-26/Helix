import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  GitCommit,
  Globe,
  Tag,
  Archive,
  ChevronRight,
  History,
  FileEdit,
  Upload,
  Search,
  AlertTriangle,
  FolderGit2,
  Star,
  ArrowUpDown,
  Folder,
  FolderPlus,
  X,
  SortAsc,
  Clock,
  SortDesc,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useBranches } from '../../hooks/useBranches';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore, type View } from '../../stores/ui-store';
import {
  useBranchPrefsStore,
  type BranchSortMode,
} from '../../stores/branch-prefs-store';
import { gitApi } from '../../api/git';
import { useQueryClient } from '@tanstack/react-query';
import { ContextMenu } from '../ui/ContextMenu';
import type { BranchInfo } from '../../../shared/git-types';

export function Sidebar() {
  const repoPath = useUIStore((s) => s.repoPath);
  const currentView = useUIStore((s) => s.currentView);
  const setView = useUIStore((s) => s.setView);
  const branches = useBranches(repoPath);
  const { data: repo } = useRepository(repoPath);
  const queryClient = useQueryClient();

  const isInConflict =
    repo?.state === 'merging' ||
    repo?.state === 'rebasing' ||
    repo?.state === 'cherry-picking';

  const handleCheckout = async (branch: string) => {
    if (!repoPath) return;
    await gitApi.checkout(repoPath, branch);
    queryClient.invalidateQueries({ queryKey: ['git'] });
  };

  return (
    <div className="h-full bg-secondary flex flex-col border-r border-default overflow-hidden">
      {/* Navigation */}
      <div className="px-2 py-3 border-b border-default flex-shrink-0">
        <NavItem
          icon={<History className="w-4 h-4" />}
          label="History"
          active={currentView === 'history'}
          onClick={() => setView('history')}
        />
        <NavItem
          icon={<FileEdit className="w-4 h-4" />}
          label="Changes"
          active={currentView === 'staging'}
          onClick={() => setView('staging')}
        />
        <NavItem
          icon={<Upload className="w-4 h-4" />}
          label="Remotes"
          active={currentView === 'remotes'}
          onClick={() => setView('remotes')}
        />
        <NavItem
          icon={<FolderGit2 className="w-4 h-4" />}
          label="Submodules"
          active={currentView === 'submodules'}
          onClick={() => setView('submodules')}
        />
        <NavItem
          icon={<Search className="w-4 h-4" />}
          label="Search"
          active={currentView === 'search'}
          onClick={() => setView('search')}
          shortcut="Ctrl+K"
        />
        {isInConflict && (
          <NavItem
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Conflicts"
            active={currentView === 'conflicts'}
            onClick={() => setView('conflicts')}
            badge="!"
            badgeColor="warning"
          />
        )}
      </div>

      {/* Branch/tag/stash tree */}
      <div className="flex-1 overflow-y-auto py-2">
        <BranchSection
          localBranches={branches.data?.local || []}
          remoteBranches={branches.data?.remote || []}
          onCheckout={handleCheckout}
        />

        <CollapsibleSection
          icon={<Globe className="w-4 h-4" />}
          title="Remotes"
          count={branches.data?.remote.length}
        >
          {branches.data?.remote.map((branch) => (
            <BranchRow
              key={branch.name}
              branch={branch}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          icon={<Tag className="w-4 h-4" />}
          title="Tags"
          count={0}
        >
          <div className="px-3 py-2 text-xs text-tertiary">No tags</div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={<Archive className="w-4 h-4" />}
          title="Stashes"
          count={0}
        >
          <button
            onClick={() => setView('stashes')}
            className="w-full px-3 py-2 text-xs text-accent hover:text-accent-hover text-left"
          >
            Manage stashes...
          </button>
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ─── Branch Section with sort, filter, folders, favourites ──────────

function BranchSection({
  localBranches,
  remoteBranches,
  onCheckout,
}: {
  localBranches: BranchInfo[];
  remoteBranches: BranchInfo[];
  onCheckout: (name: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const filter = useBranchPrefsStore((s) => s.filter);
  const setFilter = useBranchPrefsStore((s) => s.setFilter);
  const sortMode = useBranchPrefsStore((s) => s.sortMode);
  const setSortMode = useBranchPrefsStore((s) => s.setSortMode);
  const favourites = useBranchPrefsStore((s) => s.favourites);
  const folders = useBranchPrefsStore((s) => s.folders);
  const addFolder = useBranchPrefsStore((s) => s.addFolder);
  const getFolderForBranch = useBranchPrefsStore((s) => s.getFolderForBranch);

  // Filter
  const filtered = useMemo(() => {
    let list = localBranches;
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return list;
  }, [localBranches, filter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortMode) {
      case 'date-desc':
        return arr.sort(
          (a, b) => (b.lastCommitDate || 0) - (a.lastCommitDate || 0),
        );
      case 'date-asc':
        return arr.sort(
          (a, b) => (a.lastCommitDate || 0) - (b.lastCommitDate || 0),
        );
      case 'name':
      default:
        return arr.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filtered, sortMode]);

  // Split into favourites, foldered, and unfiled
  const favBranches = sorted.filter((b) => favourites.has(b.name));
  const folderedNames = new Set(folders.flatMap((f) => f.branches));
  const unfiled = sorted.filter(
    (b) => !favourites.has(b.name) && !folderedNames.has(b.name),
  );

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
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-1.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary hover:text-primary transition-colors flex-1 text-left"
        >
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="w-3 h-3" />
          </motion.div>
          <GitBranch className="w-4 h-4" />
          <span>Branches</span>
          <span className="text-tertiary font-normal">{localBranches.length}</span>
        </button>

        {/* Sort toggle */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="p-1 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors"
            title={`Sort: ${sortLabels[sortMode].label}`}
          >
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-6 z-50 bg-secondary border border-default rounded-lg shadow-lg py-1 min-w-[130px]"
              >
                {(Object.keys(sortLabels) as BranchSortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setSortMode(mode);
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      sortMode === mode
                        ? 'text-accent bg-accent-muted'
                        : 'text-secondary hover:text-primary hover:bg-hover'
                    }`}
                  >
                    {sortLabels[mode].icon}
                    {sortLabels[mode].label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add folder */}
        <button
          onClick={() => setCreatingFolder(!creatingFolder)}
          className="p-1 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors"
          title="Create folder"
        >
          <FolderPlus className="w-3 h-3" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Filter input */}
            {localBranches.length > 10 && (
              <div className="px-3 pb-1.5">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter branches..."
                  className="w-full bg-input border border-default rounded px-2 py-1 text-xs text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {/* Create folder input */}
            <AnimatePresence>
              {creatingFolder && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-3 pb-1.5"
                >
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name..."
                      className="flex-1 bg-input border border-default rounded px-2 py-1 text-xs text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') setCreatingFolder(false);
                      }}
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="px-2 py-1 bg-accent text-text-inverse rounded text-xs hover:bg-accent-hover transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Favourites section */}
            {favBranches.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
                  <Star className="w-3 h-3 fill-current" />
                  Favourites
                </div>
                {favBranches.map((branch) => (
                  <BranchRow
                    key={branch.name}
                    branch={branch}
                    onCheckout={() => onCheckout(branch.name)}
                    showDate={sortMode !== 'name'}
                  />
                ))}
              </div>
            )}

            {/* Folders */}
            {folders.map((folder) => {
              const folderBranches = sorted.filter((b) =>
                folder.branches.includes(b.name),
              );
              if (filter && folderBranches.length === 0) return null;
              return (
                <BranchFolder
                  key={folder.name}
                  folder={folder}
                  branches={folderBranches}
                  onCheckout={onCheckout}
                  showDate={sortMode !== 'name'}
                />
              );
            })}

            {/* Unfiled branches */}
            {unfiled.map((branch) => (
              <BranchRow
                key={branch.name}
                branch={branch}
                onCheckout={() => onCheckout(branch.name)}
                showDate={sortMode !== 'name'}
              />
            ))}

            {sorted.length === 0 && filter && (
              <div className="px-3 py-3 text-xs text-tertiary text-center">
                No branches matching "{filter}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Branch Folder ──────────────────────────────────────────────────

function BranchFolder({
  folder,
  branches,
  onCheckout,
  showDate,
}: {
  folder: { name: string; branches: string[]; collapsed: boolean };
  branches: BranchInfo[];
  onCheckout: (name: string) => void;
  showDate: boolean;
}) {
  const toggleCollapse = useBranchPrefsStore((s) => s.toggleFolderCollapse);
  const removeFolder = useBranchPrefsStore((s) => s.removeFolder);

  return (
    <div className="mb-0.5">
      <ContextMenu
        items={[
          {
            label: 'Remove Folder',
            icon: <X className="w-4 h-4" />,
            danger: true,
            onClick: () => removeFolder(folder.name),
          },
        ]}
      >
        <button
          onClick={() => toggleCollapse(folder.name)}
          className="w-full flex items-center gap-1.5 px-3 py-1 text-xs text-secondary hover:text-primary hover:bg-hover transition-colors"
        >
          <motion.div
            animate={{ rotate: folder.collapsed ? 0 : 90 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="w-3 h-3" />
          </motion.div>
          <Folder className="w-3 h-3 text-accent" />
          <span className="font-medium">{folder.name}</span>
          <span className="text-tertiary ml-auto">{branches.length}</span>
        </button>
      </ContextMenu>
      <AnimatePresence initial={false}>
        {!folder.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden pl-3"
          >
            {branches.map((branch) => (
              <BranchRow
                key={branch.name}
                branch={branch}
                onCheckout={() => onCheckout(branch.name)}
                showDate={showDate}
              />
            ))}
            {branches.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-tertiary">
                Drag branches here
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Single Branch Row ──────────────────────────────────────────────

function BranchRow({
  branch,
  onCheckout,
  showDate = false,
}: {
  branch: BranchInfo;
  onCheckout?: () => void;
  showDate?: boolean;
}) {
  const toggleFavourite = useBranchPrefsStore((s) => s.toggleFavourite);
  const isFav = useBranchPrefsStore((s) => s.favourites.has(branch.name));
  const folders = useBranchPrefsStore((s) => s.folders);
  const addBranchToFolder = useBranchPrefsStore((s) => s.addBranchToFolder);
  const removeBranchFromFolder = useBranchPrefsStore(
    (s) => s.removeBranchFromFolder,
  );
  const getFolderForBranch = useBranchPrefsStore((s) => s.getFolderForBranch);

  const currentFolder = getFolderForBranch(branch.name);

  const contextItems = [
    ...(onCheckout && !branch.current
      ? [{ label: 'Checkout', icon: <GitCommit className="w-4 h-4" />, onClick: onCheckout }]
      : []),
    {
      label: isFav ? 'Remove from Favourites' : 'Add to Favourites',
      icon: <Star className={`w-4 h-4 ${isFav ? 'fill-current text-warning' : ''}`} />,
      onClick: () => toggleFavourite(branch.name),
    },
    { separator: true, label: '' },
    ...folders.map((f) => ({
      label: currentFolder === f.name ? `Remove from ${f.name}` : `Move to ${f.name}`,
      icon: <Folder className="w-4 h-4" />,
      onClick: () => {
        if (currentFolder === f.name) {
          removeBranchFromFolder(f.name, branch.name);
        } else {
          if (currentFolder) removeBranchFromFolder(currentFolder, branch.name);
          addBranchToFolder(f.name, branch.name);
        }
      },
    })),
  ];

  const timeAgo = branch.lastCommitDate
    ? formatDistanceToNow(new Date(branch.lastCommitDate * 1000), {
        addSuffix: true,
      })
    : null;

  return (
    <ContextMenu items={contextItems}>
      <button
        onClick={onCheckout}
        className={`
          w-full flex items-center gap-2 px-3 py-1 text-sm transition-colors group
          ${branch.current ? 'text-accent bg-accent-muted' : 'text-secondary hover:text-primary hover:bg-hover'}
        `}
      >
        <GitCommit className="w-3 h-3 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate">{branch.name}</div>
          {showDate && timeAgo && (
            <div className="text-[10px] text-tertiary truncate">{timeAgo}</div>
          )}
        </div>

        {/* Fav star — visible on hover or if favourited */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavourite(branch.name);
          }}
          className={`p-0.5 rounded transition-all flex-shrink-0 ${
            isFav
              ? 'text-warning opacity-100'
              : 'text-tertiary opacity-0 group-hover:opacity-100 hover:text-warning'
          }`}
        >
          <Star className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
        </button>

        {(branch.ahead || branch.behind) && (
          <span className="flex items-center gap-1 text-xs text-tertiary flex-shrink-0">
            {branch.ahead ? <span className="text-success">+{branch.ahead}</span> : null}
            {branch.behind ? <span className="text-danger">-{branch.behind}</span> : null}
          </span>
        )}
      </button>
    </ContextMenu>
  );
}

// ─── Reusable components ────────────────────────────────────────────

function NavItem({
  icon,
  label,
  active,
  onClick,
  shortcut,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string;
  badge?: string;
  badgeColor?: 'warning' | 'danger' | 'accent';
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors mb-0.5
        ${active ? 'bg-accent-muted text-accent font-medium' : 'text-secondary hover:text-primary hover:bg-hover'}
      `}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span
          className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-text-inverse ${
            badgeColor === 'warning'
              ? 'bg-warning'
              : badgeColor === 'danger'
                ? 'bg-danger'
                : 'bg-accent'
          }`}
        >
          {badge}
        </span>
      )}
      {shortcut && (
        <kbd className="text-[10px] px-1 py-0.5 rounded bg-tertiary text-tertiary">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

function CollapsibleSection({
  icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary hover:text-primary hover:bg-hover transition-colors"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="w-3 h-3" />
        </motion.div>
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {count !== undefined && (
          <span className="text-tertiary font-normal">{count}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

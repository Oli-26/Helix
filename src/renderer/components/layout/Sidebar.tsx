import { useState } from 'react';
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
} from 'lucide-react';
import { useBranches } from '../../hooks/useBranches';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore, type View } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { useQueryClient } from '@tanstack/react-query';

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
        <SidebarSection
          icon={<GitBranch className="w-4 h-4" />}
          title="Branches"
          count={branches.data?.local.length}
          defaultOpen
        >
          {branches.data?.local.map((branch) => (
            <BranchItem
              key={branch.name}
              name={branch.name}
              current={branch.current}
              ahead={branch.ahead}
              behind={branch.behind}
              onCheckout={() => handleCheckout(branch.name)}
            />
          ))}
        </SidebarSection>

        <SidebarSection
          icon={<Globe className="w-4 h-4" />}
          title="Remotes"
          count={branches.data?.remote.length}
        >
          {branches.data?.remote.map((branch) => (
            <BranchItem
              key={branch.name}
              name={branch.name}
              current={false}
            />
          ))}
        </SidebarSection>

        <SidebarSection
          icon={<Tag className="w-4 h-4" />}
          title="Tags"
          count={0}
        >
          <div className="px-3 py-2 text-xs text-tertiary">No tags</div>
        </SidebarSection>

        <SidebarSection
          icon={<Archive className="w-4 h-4" />}
          title="Stashes"
          count={0}
          onClick={() => setView('stashes')}
        >
          <button
            onClick={() => setView('stashes')}
            className="w-full px-3 py-2 text-xs text-accent hover:text-accent-hover text-left"
          >
            Manage stashes...
          </button>
        </SidebarSection>
      </div>
    </div>
  );
}

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

function SidebarSection({
  icon,
  title,
  count,
  defaultOpen = false,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          onClick?.();
        }}
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

function BranchItem({
  name,
  current,
  ahead,
  behind,
  onCheckout,
}: {
  name: string;
  current: boolean;
  ahead?: number;
  behind?: number;
  onCheckout?: () => void;
}) {
  return (
    <button
      onClick={onCheckout}
      className={`
        w-full flex items-center gap-2 px-3 py-1 text-sm transition-colors
        ${current ? 'text-accent bg-accent-muted' : 'text-secondary hover:text-primary hover:bg-hover'}
      `}
    >
      <GitCommit className="w-3 h-3 flex-shrink-0" />
      <span className="truncate flex-1 text-left">{name}</span>
      {(ahead || behind) && (
        <span className="flex items-center gap-1 text-xs text-tertiary">
          {ahead ? <span className="text-success">+{ahead}</span> : null}
          {behind ? <span className="text-danger">-{behind}</span> : null}
        </span>
      )}
    </button>
  );
}

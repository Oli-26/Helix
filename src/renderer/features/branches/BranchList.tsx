import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  GitMerge,
  Plus,
  Trash2,
  Check,
  Globe,
  Search,
} from 'lucide-react';
import { useBranches } from '../../hooks/useBranches';
import { useRepository } from '../../hooks/useRepository';
import { useUIStore , useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';

export function BranchList() {
  const repoPath = useRepoPath();
  const { data: branches, isLoading } = useBranches(repoPath);
  const { data: repo } = useRepository(repoPath);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const checkoutMutation = useMutation({
    mutationFn: (branch: string) => gitApi.checkout(repoPath!, branch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['git'] }),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => gitApi.createBranch(repoPath!, name),
    onSuccess: () => {
      setNewBranchName('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['git'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => gitApi.deleteBranch(repoPath!, name),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git', 'branches'] }),
  });

  const filteredLocal =
    branches?.local.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const filteredRemote =
    branches?.remote.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        Loading branches...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-default">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter branches..."
            className="w-full bg-input border border-default rounded-lg pl-9 pr-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* Create branch input */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-default"
          >
            <div className="flex gap-2 p-4">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Branch name..."
                className="flex-1 bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBranchName.trim()) {
                    createMutation.mutate(newBranchName.trim());
                  }
                }}
              />
              <button
                onClick={() => createMutation.mutate(newBranchName.trim())}
                disabled={!newBranchName.trim()}
                className="px-4 py-2 bg-success text-text-inverse rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branch lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Local branches */}
        <div className="p-2">
          <h3 className="px-2 py-1 text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-3 h-3" />
            Local ({filteredLocal.length})
          </h3>
          {filteredLocal.map((branch) => (
            <motion.div
              key={branch.name}
              layout
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm group transition-colors
                ${branch.current ? 'bg-accent-muted' : 'hover:bg-hover'}
              `}
            >
              {branch.current ? (
                <Check className="w-4 h-4 text-accent flex-shrink-0" />
              ) : (
                <GitBranch className="w-4 h-4 text-secondary flex-shrink-0" />
              )}
              <span
                className={`flex-1 truncate ${branch.current ? 'text-accent font-medium' : 'text-primary'}`}
              >
                {branch.name}
              </span>
              {!branch.current && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => checkoutMutation.mutate(branch.name)}
                    className="p-1 rounded text-accent hover:bg-accent-muted transition-colors"
                    title="Checkout"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(branch.name)}
                    className="p-1 rounded text-danger hover:bg-danger-muted transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Remote branches */}
        <div className="p-2 border-t border-subtle">
          <h3 className="px-2 py-1 text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-3 h-3" />
            Remote ({filteredRemote.length})
          </h3>
          {filteredRemote.map((branch) => (
            <div
              key={branch.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-hover transition-colors"
            >
              <Globe className="w-4 h-4 text-tertiary flex-shrink-0" />
              <span className="flex-1 truncate text-secondary">
                {branch.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

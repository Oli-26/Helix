import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Search,
  GitCommit,
  GitBranch,
  Tag,
  User,
  Calendar,
  Hash,
  FileSearch,
  Loader2,
} from 'lucide-react';
import { useUIStore , useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import type { CommitNode } from '../../../shared/git-types';

export function SearchView() {
  const repoPath = useRepoPath();
  const setSelectedCommit = useUIStore((s) => s.setSelectedCommit);
  const setView = useUIStore((s) => s.setView);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const debounceTimeout = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (value: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => setDebouncedQuery(value), 300);
      };
    })(),
    [],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debounceTimeout(value);
  };

  const searchResults = useQuery({
    queryKey: ['git', 'search', repoPath, debouncedQuery],
    queryFn: () => gitApi.searchCommits(repoPath!, debouncedQuery),
    enabled: !!repoPath && debouncedQuery.length >= 2,
  });

  const handleSelectCommit = (hash: string) => {
    setSelectedCommit(hash);
    setView('history');
  };

  return (
    <div className="h-full flex flex-col bg-primary">
      {/* Search input */}
      <div className="p-4 border-b border-default flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search commits by message, author, or hash..."
            className="w-full bg-input border border-default rounded-lg pl-10 pr-4 py-2.5 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            autoFocus
          />
          {searchResults.isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
          )}
        </div>
        {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
          <div className="text-xs text-tertiary mt-2">
            Type at least 2 characters to search
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!debouncedQuery && (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <FileSearch className="w-12 h-12 mb-3 text-tertiary" />
            <span className="text-sm font-medium">Search your repository</span>
            <span className="text-xs text-tertiary mt-1">
              Find commits by message, author name, or hash
            </span>
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
              <SearchHint label="fix login bug" onClick={() => handleQueryChange('fix login bug')} />
              <SearchHint label="refactor" onClick={() => handleQueryChange('refactor')} />
              <SearchHint label="merge" onClick={() => handleQueryChange('merge')} />
              <SearchHint label="release" onClick={() => handleQueryChange('release')} />
            </div>
          </div>
        )}

        {debouncedQuery.length >= 2 && searchResults.data && (
          <div className="p-2">
            <div className="px-3 py-2 text-xs text-secondary">
              {searchResults.data.length} result
              {searchResults.data.length !== 1 ? 's' : ''} for "{debouncedQuery}"
            </div>
            <AnimatePresence>
              {searchResults.data.map((commit, index) => (
                <SearchResultItem
                  key={commit.hash}
                  commit={commit}
                  index={index}
                  onClick={() => handleSelectCommit(commit.hash)}
                />
              ))}
            </AnimatePresence>
            {searchResults.data.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-tertiary mx-auto mb-2" />
                <div className="text-sm text-secondary">
                  No commits found matching "{debouncedQuery}"
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultItem({
  commit,
  index,
  onClick,
}: {
  commit: CommitNode;
  index: number;
  onClick: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(commit.authorDate * 1000), {
    addSuffix: true,
  });

  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left hover:bg-hover transition-colors group"
    >
      <GitCommit className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-primary font-medium truncate">
            {commit.subject}
          </span>
          {commit.refs
            .filter((r) => !r.startsWith('tag:'))
            .slice(0, 2)
            .map((ref) => (
              <span
                key={ref}
                className="inline-flex items-center gap-1 px-1.5 py-0 text-[10px] rounded bg-accent-muted text-accent font-medium flex-shrink-0"
              >
                <GitBranch className="w-2.5 h-2.5" />
                {ref.replace('HEAD -> ', '')}
              </span>
            ))}
          {commit.refs
            .filter((r) => r.startsWith('tag:'))
            .slice(0, 2)
            .map((ref) => (
              <span
                key={ref}
                className="inline-flex items-center gap-1 px-1.5 py-0 text-[10px] rounded bg-warning-muted text-warning font-medium flex-shrink-0"
              >
                <Tag className="w-2.5 h-2.5" />
                {ref.replace('tag: ', '')}
              </span>
            ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-tertiary">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            <span className="font-mono">{commit.abbreviatedHash}</span>
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {commit.authorName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function SearchHint({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full bg-tertiary text-xs text-secondary hover:text-primary hover:bg-hover transition-colors"
    >
      {label}
    </button>
  );
}

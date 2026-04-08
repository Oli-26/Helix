import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Columns2, Rows3, FileText, Copy, Check } from 'lucide-react';
import { gitApi } from '../../api/git';
import { useUIStore } from '../../stores/ui-store';
import { UnifiedDiff } from './UnifiedDiff';
import { SplitDiff } from './SplitDiff';
import type { DiffFile } from '../../../shared/git-types';

interface DiffViewProps {
  filePath?: string;
  staged?: boolean;
  commitHash?: string;
}

export function DiffView({ filePath, staged, commitHash }: DiffViewProps) {
  const repoPath = useUIStore((s) => s.repoPath);
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);

  const fileDiff = useQuery({
    queryKey: ['git', 'diff-file', repoPath, filePath, staged],
    queryFn: () => gitApi.getDiffForFile(repoPath!, filePath!, staged),
    enabled: !!repoPath && !!filePath && !commitHash,
  });

  const commitDiff = useQuery({
    queryKey: ['git', 'diff-commit', repoPath, commitHash],
    queryFn: () => gitApi.getDiffForCommit(repoPath!, commitHash!),
    enabled: !!repoPath && !!commitHash,
  });

  const files: DiffFile[] = commitHash
    ? commitDiff.data || []
    : fileDiff.data
      ? [fileDiff.data]
      : [];

  const isLoading = commitHash ? commitDiff.isLoading : fileDiff.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full mr-2"
        />
        Loading diff...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-secondary">
        <FileText className="w-10 h-10 mb-3 text-tertiary" />
        <span className="text-sm">No changes to display</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-default flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-secondary">
          <span className="font-medium text-primary">
            {files.length} file{files.length !== 1 ? 's' : ''} changed
          </span>
          {files.reduce(
            (acc, f) => {
              acc.add += f.stats?.additions || 0;
              acc.del += f.stats?.deletions || 0;
              return acc;
            },
            { add: 0, del: 0 },
          ) &&
            (() => {
              const stats = files.reduce(
                (acc, f) => ({
                  add: acc.add + (f.stats?.additions || 0),
                  del: acc.del + (f.stats?.deletions || 0),
                }),
                { add: 0, del: 0 },
              );
              return (
                <>
                  <span className="text-success">+{stats.add}</span>
                  <span className="text-danger">-{stats.del}</span>
                </>
              );
            })()}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDiffViewMode('unified')}
            className={`p-1.5 rounded transition-colors ${diffViewMode === 'unified' ? 'bg-accent-muted text-accent' : 'text-secondary hover:text-primary hover:bg-hover'}`}
            title="Unified view"
          >
            <Rows3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDiffViewMode('split')}
            className={`p-1.5 rounded transition-colors ${diffViewMode === 'split' ? 'bg-accent-muted text-accent' : 'text-secondary hover:text-primary hover:bg-hover'}`}
            title="Split view"
          >
            <Columns2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <DiffFileSection key={file.newPath} file={file} mode={diffViewMode} />
        ))}
      </div>
    </div>
  );
}

function DiffFileSection({
  file,
  mode,
}: {
  file: DiffFile;
  mode: 'unified' | 'split';
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.newPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    added: 'text-success',
    deleted: 'text-danger',
    modified: 'text-warning',
    renamed: 'text-accent',
  };

  return (
    <div className="border-b border-default">
      {/* File header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-tertiary hover:bg-hover transition-colors text-left cursor-pointer"
      >
        <span className={`text-xs font-medium uppercase ${statusColors[file.status]}`}>
          {file.status}
        </span>
        <span className="text-sm font-mono text-primary flex-1 truncate">
          {file.status === 'renamed'
            ? `${file.oldPath} → ${file.newPath}`
            : file.newPath}
        </span>
        {file.stats && (
          <span className="flex items-center gap-2 text-xs flex-shrink-0">
            <span className="text-success">+{file.stats.additions}</span>
            <span className="text-danger">-{file.stats.deletions}</span>
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyPath();
          }}
          className="p-1 rounded hover:bg-active transition-colors"
          title="Copy file path"
        >
          {copied ? (
            <Check className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3 text-tertiary" />
          )}
        </button>
      </div>

      {/* Diff content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {file.hunks.length === 0 ? (
              <div className="px-4 py-6 text-sm text-tertiary text-center">
                Binary file or no displayable changes
              </div>
            ) : mode === 'unified' ? (
              <UnifiedDiff file={file} />
            ) : (
              <SplitDiff file={file} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

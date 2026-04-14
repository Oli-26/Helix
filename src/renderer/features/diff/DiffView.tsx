import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Columns2, Rows3, FileText, Copy, Check, EyeOff, AlignJustify } from 'lucide-react';
import { gitApi } from '../../api/git';
import { useUIStore , useRepoPath } from '../../stores/ui-store';
import { UnifiedDiff } from './UnifiedDiff';
import { SplitDiff } from './SplitDiff';
import { toast } from '../../components/ui/Toast';
import type { DiffFile, DiffHunk } from '../../../shared/git-types';

interface DiffViewProps {
  filePath?: string;
  staged?: boolean;
  commitHash?: string;
  enableLineStaging?: boolean;
}

// Generate a unified diff patch from selected lines
function buildPatchFromSelection(file: DiffFile, selectedLines: Set<string>): string {
  const lines: string[] = [];
  lines.push(`--- a/${file.oldPath}`);
  lines.push(`+++ b/${file.newPath}`);

  for (let hunkIndex = 0; hunkIndex < file.hunks.length; hunkIndex++) {
    const hunk = file.hunks[hunkIndex];
    const hunkLines: string[] = [];
    let hasSelectedInHunk = false;

    for (let lineIndex = 0; lineIndex < hunk.lines.length; lineIndex++) {
      const lineKey = `${hunkIndex}-${lineIndex}`;
      const line = hunk.lines[lineIndex];
      if (selectedLines.has(lineKey)) {
        hasSelectedInHunk = true;
        if (line.type === 'add') {
          hunkLines.push(`+${line.content}`);
        } else if (line.type === 'delete') {
          hunkLines.push(`-${line.content}`);
        }
      } else {
        // Non-selected changes become context
        if (line.type === 'context') {
          hunkLines.push(` ${line.content}`);
        } else if (line.type === 'delete') {
          // Keep deleted lines as context (they exist in the original)
          hunkLines.push(` ${line.content}`);
        }
        // Non-selected adds are omitted
      }
    }

    if (hasSelectedInHunk) {
      // Recalculate hunk header based on actual content
      let oldCount = 0;
      let newCount = 0;
      for (const l of hunkLines) {
        if (l.startsWith(' ')) { oldCount++; newCount++; }
        else if (l.startsWith('-')) { oldCount++; }
        else if (l.startsWith('+')) { newCount++; }
      }
      lines.push(`@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@`);
      lines.push(...hunkLines);
    }
  }

  return lines.join('\n') + '\n';
}

export function DiffView({ filePath, staged, commitHash, enableLineStaging }: DiffViewProps) {
  const repoPath = useRepoPath();
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);
  const queryClient = useQueryClient();

  // Diff options
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [contextLines, setContextLines] = useState(3);

  // Moved handleStageLines below files declaration

  const fileDiff = useQuery({
    queryKey: ['git', 'diff-file', repoPath, filePath, staged, ignoreWhitespace, contextLines],
    queryFn: () =>
      (ignoreWhitespace || contextLines !== 3)
        ? gitApi.getDiffForFileWithOptions(repoPath!, filePath!, staged, { ignoreWhitespace, contextLines })
        : gitApi.getDiffForFile(repoPath!, filePath!, staged),
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

  const handleStageLines = useCallback(async (selectedLines: Set<string>) => {
    if (!repoPath || !filePath || files.length === 0) return;
    try {
      const patch = buildPatchFromSelection(files[0], selectedLines);
      await gitApi.stageLines(repoPath, filePath, patch);
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success('Lines staged');
    } catch (err: any) {
      toast.error('Stage lines failed', err?.message || 'Failed to apply patch');
    }
  }, [repoPath, filePath, files, queryClient]);

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
          {/* Diff options - only for file diffs, not commit diffs */}
          {!commitHash && (
            <>
              <button
                onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
                className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
                  ignoreWhitespace ? 'bg-accent-muted text-accent' : 'text-secondary hover:text-primary hover:bg-hover'
                }`}
                title="Ignore whitespace changes"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Whitespace</span>
              </button>
              <div className="flex items-center gap-1 ml-1">
                <AlignJustify className="w-3.5 h-3.5 text-tertiary" />
                <select
                  value={contextLines}
                  onChange={(e) => setContextLines(Number(e.target.value))}
                  className="bg-transparent text-xs text-secondary border border-default rounded px-1 py-0.5 focus:outline-none focus:border-accent"
                  title="Context lines"
                >
                  <option value={0}>0 lines</option>
                  <option value={1}>1 line</option>
                  <option value={3}>3 lines</option>
                  <option value={5}>5 lines</option>
                  <option value={10}>10 lines</option>
                  <option value={20}>20 lines</option>
                </select>
              </div>
              <div className="w-px h-4 bg-default mx-1" />
            </>
          )}
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
          <DiffFileSection
            key={file.newPath}
            file={file}
            mode={diffViewMode}
            enableLineStaging={enableLineStaging && !commitHash}
            onStageLines={handleStageLines}
          />
        ))}
      </div>
    </div>
  );
}

function DiffFileSection({
  file,
  mode,
  enableLineStaging,
  onStageLines,
}: {
  file: DiffFile;
  mode: 'unified' | 'split';
  enableLineStaging?: boolean;
  onStageLines?: (selectedLines: Set<string>) => void;
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
              <UnifiedDiff
                file={file}
                enableLineSelection={enableLineStaging}
                onStageLines={onStageLines}
              />
            ) : (
              <SplitDiff file={file} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import {
  User,
  Calendar,
  Hash,
  Plus,
  Minus,
  Edit3,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { gitApi } from '../../api/git';
import { useUIStore , useRepoPath } from '../../stores/ui-store';
import { FileIcon } from '../../components/shared/FileIcon';
import { DiffStatBar } from '../../components/shared/DiffStatBar';
import { UnifiedDiff } from '../diff/UnifiedDiff';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import type { DiffFile } from '../../../shared/git-types';

export function CommitDetail({ hash }: { hash: string }) {
  const repoPath = useRepoPath();
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const prevHashRef = useRef(hash);

  // Reset expanded file when commit changes
  if (prevHashRef.current !== hash) {
    prevHashRef.current = hash;
    if (expandedFile) setExpandedFile(null);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['git', 'commit-detail', repoPath, hash],
    queryFn: () => gitApi.getCommitDetail(repoPath!, hash),
    enabled: !!repoPath && !!hash,
  });

  if (isLoading || !data) {
    return <SkeletonPanel rows={4} />;
  }

  const { commit, files } = data;

  const totalStats = files.reduce(
    (acc, f) => ({
      additions: acc.additions + (f.stats?.additions || 0),
      deletions: acc.deletions + (f.stats?.deletions || 0),
    }),
    { additions: 0, deletions: 0 },
  );

  return (
    <motion.div
      key={hash}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full overflow-y-auto bg-primary border-t border-default"
    >
      <div className="p-4">
        {/* Commit message */}
        <h3 className="text-sm font-semibold text-primary mb-1">
          {commit?.subject}
        </h3>
        {commit?.body && (
          <p className="text-xs text-secondary mb-3 whitespace-pre-wrap">
            {commit.body}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-xs text-secondary mb-3">
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            {commit?.authorName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {commit
              ? format(new Date(commit.authorDate * 1000), 'PPp')
              : ''}
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Hash className="w-3 h-3" />
            {commit?.abbreviatedHash}
          </span>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-3 text-xs text-secondary mb-3 pb-3 border-b border-default">
          <span>
            {files.length} file{files.length !== 1 ? 's' : ''} changed
          </span>
          {totalStats.additions > 0 && (
            <span className="text-success">+{totalStats.additions}</span>
          )}
          {totalStats.deletions > 0 && (
            <span className="text-danger">-{totalStats.deletions}</span>
          )}
        </div>

        {/* Changed files — clickable */}
        <div>
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
            Changed Files
          </h4>
          <div className="space-y-0.5">
            {files.map((file) => (
              <FileItem
                key={file.newPath}
                file={file}
                isExpanded={expandedFile === file.newPath}
                onToggle={() =>
                  setExpandedFile(
                    expandedFile === file.newPath ? null : file.newPath,
                  )
                }
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FileItem({
  file,
  isExpanded,
  onToggle,
}: {
  file: DiffFile;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusIcon = {
    added: <Plus className="w-3 h-3 text-success" />,
    deleted: <Minus className="w-3 h-3 text-danger" />,
    modified: <Edit3 className="w-3 h-3 text-warning" />,
    renamed: <FileText className="w-3 h-3 text-accent" />,
  };

  return (
    <div className="rounded-md overflow-hidden border border-transparent hover:border-default transition-colors">
      {/* File row — clickable */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left transition-colors ${
          isExpanded ? 'bg-tertiary' : 'hover:bg-hover'
        }`}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="w-3 h-3 text-tertiary" />
        </motion.div>
        <FileIcon filename={file.newPath} />
        {statusIcon[file.status]}
        <span className="text-primary truncate flex-1 font-mono">
          {file.status === 'renamed'
            ? `${file.oldPath} → ${file.newPath}`
            : file.newPath}
        </span>
        {file.stats && (
          <DiffStatBar
            additions={file.stats.additions}
            deletions={file.stats.deletions}
          />
        )}
      </button>

      {/* Inline diff */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-default"
          >
            {file.hunks.length > 0 ? (
              <div className="max-h-[400px] overflow-auto">
                <UnifiedDiff file={file} />
              </div>
            ) : (
              <div className="px-4 py-6 text-xs text-tertiary text-center">
                Binary file or no displayable changes
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

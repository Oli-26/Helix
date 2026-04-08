import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import {
  User,
  Calendar,
  Hash,
  FileText,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';
import { gitApi } from '../../api/git';
import { useUIStore } from '../../stores/ui-store';
import type { DiffFile } from '../../../shared/git-types';

export function CommitDetail({ hash }: { hash: string }) {
  const repoPath = useUIStore((s) => s.repoPath);

  const { data, isLoading } = useQuery({
    queryKey: ['git', 'commit-detail', repoPath, hash],
    queryFn: () => gitApi.getCommitDetail(repoPath!, hash),
    enabled: !!repoPath && !!hash,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        Loading...
      </div>
    );
  }

  const { commit, files } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full overflow-y-auto bg-primary border-t border-default"
    >
      <div className="p-4">
        {/* Commit message */}
        <h3 className="text-sm font-semibold text-primary mb-3">
          {commit?.subject}
        </h3>
        {commit?.body && (
          <p className="text-xs text-secondary mb-4 whitespace-pre-wrap">
            {commit.body}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-xs text-secondary mb-4">
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

        {/* Changed files */}
        <div className="border-t border-default pt-3">
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
            Changed Files ({files.length})
          </h4>
          <div className="space-y-0.5">
            {files.map((file) => (
              <FileItem key={file.newPath} file={file} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FileItem({ file }: { file: DiffFile }) {
  const statusIcon = {
    added: <Plus className="w-3 h-3 text-success" />,
    deleted: <Minus className="w-3 h-3 text-danger" />,
    modified: <Edit3 className="w-3 h-3 text-warning" />,
    renamed: <FileText className="w-3 h-3 text-accent" />,
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-hover transition-colors text-xs">
      {statusIcon[file.status]}
      <span className="text-primary truncate flex-1 font-mono">
        {file.newPath}
      </span>
      {file.stats && (
        <span className="flex items-center gap-1.5 flex-shrink-0">
          {file.stats.additions > 0 && (
            <span className="text-success">+{file.stats.additions}</span>
          )}
          {file.stats.deletions > 0 && (
            <span className="text-danger">-{file.stats.deletions}</span>
          )}
        </span>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Allotment } from 'allotment';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Minus,
  Edit3,
  FileQuestion,
  ChevronUp,
  ChevronDown,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useStatus } from '../../hooks/useStatus';
import { useUIStore } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { DiffView } from '../diff/DiffView';
import type { FileStatus } from '../../../shared/git-types';

export function StagingView() {
  const repoPath = useUIStore((s) => s.repoPath);
  const { data: files, isLoading } = useStatus(repoPath);
  const queryClient = useQueryClient();
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    staged: boolean;
  } | null>(null);

  const stagedFiles = files?.filter((f) => f.isStaged) || [];
  const unstagedFiles = files?.filter((f) => !f.isStaged) || [];

  const stageMutation = useMutation({
    mutationFn: (filePaths: string[]) => gitApi.stage(repoPath!, filePaths),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] }),
  });

  const unstageMutation = useMutation({
    mutationFn: (filePaths: string[]) =>
      gitApi.unstage(repoPath!, filePaths),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] }),
  });

  const discardMutation = useMutation({
    mutationFn: (filePaths: string[]) =>
      gitApi.discardChanges(repoPath!, filePaths),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] }),
  });

  const commitMutation = useMutation({
    mutationFn: () => gitApi.commit(repoPath!, commitMessage),
    onSuccess: () => {
      setCommitMessage('');
      queryClient.invalidateQueries({ queryKey: ['git'] });
    },
  });

  const stageAll = () => {
    const paths = unstagedFiles.map((f) => f.path);
    if (paths.length > 0) stageMutation.mutate(paths);
  };

  const unstageAll = () => {
    const paths = stagedFiles.map((f) => f.path);
    if (paths.length > 0) unstageMutation.mutate(paths);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        Loading status...
      </div>
    );
  }

  return (
    <Allotment>
      {/* Left: file lists + commit box */}
      <Allotment.Pane minSize={250} preferredSize={350}>
        <div className="h-full flex flex-col bg-primary">
          {/* Unstaged changes */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <SectionHeader
              title="Unstaged Changes"
              count={unstagedFiles.length}
              action={
                <button
                  onClick={stageAll}
                  className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                  title="Stage all"
                >
                  <ChevronDown className="w-3 h-3" />
                  Stage All
                </button>
              }
            />
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence>
                {unstagedFiles.map((file) => (
                  <FileRow
                    key={file.path}
                    file={file}
                    isSelected={
                      selectedFile?.path === file.path &&
                      !selectedFile?.staged
                    }
                    onSelect={() =>
                      setSelectedFile({ path: file.path, staged: false })
                    }
                    onStage={() => stageMutation.mutate([file.path])}
                    onDiscard={() => discardMutation.mutate([file.path])}
                    actionIcon={<ChevronDown className="w-3.5 h-3.5" />}
                    actionTitle="Stage"
                  />
                ))}
              </AnimatePresence>
              {unstagedFiles.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-tertiary">
                  No unstaged changes
                </div>
              )}
            </div>
          </div>

          {/* Staged changes */}
          <div className="flex-1 overflow-hidden flex flex-col border-t border-default">
            <SectionHeader
              title="Staged Changes"
              count={stagedFiles.length}
              action={
                <button
                  onClick={unstageAll}
                  className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                  title="Unstage all"
                >
                  <ChevronUp className="w-3 h-3" />
                  Unstage All
                </button>
              }
            />
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence>
                {stagedFiles.map((file) => (
                  <FileRow
                    key={file.path}
                    file={file}
                    isSelected={
                      selectedFile?.path === file.path &&
                      selectedFile?.staged
                    }
                    onSelect={() =>
                      setSelectedFile({ path: file.path, staged: true })
                    }
                    onStage={() => unstageMutation.mutate([file.path])}
                    actionIcon={<ChevronUp className="w-3.5 h-3.5" />}
                    actionTitle="Unstage"
                  />
                ))}
              </AnimatePresence>
              {stagedFiles.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-tertiary">
                  No staged changes
                </div>
              )}
            </div>
          </div>

          {/* Commit box */}
          <div className="border-t border-default p-4 flex-shrink-0">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              rows={3}
              onKeyDown={(e) => {
                if (
                  (e.ctrlKey || e.metaKey) &&
                  e.key === 'Enter' &&
                  stagedFiles.length > 0 &&
                  commitMessage.trim()
                ) {
                  commitMutation.mutate();
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-tertiary">
                {commitMessage.length > 0
                  ? `${commitMessage.split('\n')[0].length}/72 chars`
                  : 'Ctrl+Enter to commit'}
              </span>
              <button
                onClick={() => commitMutation.mutate()}
                disabled={
                  stagedFiles.length === 0 ||
                  !commitMessage.trim() ||
                  commitMutation.isPending
                }
                className="flex items-center gap-2 px-4 py-1.5 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" />
                {commitMutation.isPending ? 'Committing...' : 'Commit'}
              </button>
            </div>
          </div>
        </div>
      </Allotment.Pane>

      {/* Right: diff viewer */}
      <Allotment.Pane>
        {selectedFile ? (
          <DiffView filePath={selectedFile.path} staged={selectedFile.staged} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-secondary">
            <Edit3 className="w-10 h-10 mb-3 text-tertiary" />
            <span className="text-sm">Select a file to view diff</span>
          </div>
        )}
      </Allotment.Pane>
    </Allotment>
  );
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary flex-shrink-0">
      <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
        {title}{' '}
        <span className="text-tertiary font-normal">({count})</span>
      </span>
      {action}
    </div>
  );
}

function FileRow({
  file,
  isSelected,
  onSelect,
  onStage,
  onDiscard,
  actionIcon,
  actionTitle,
}: {
  file: FileStatus;
  isSelected: boolean;
  onSelect: () => void;
  onStage: () => void;
  onDiscard?: () => void;
  actionIcon: React.ReactNode;
  actionTitle: string;
}) {
  const statusIcons: Record<string, React.ReactNode> = {
    M: <Edit3 className="w-3 h-3 text-warning" />,
    A: <Plus className="w-3 h-3 text-success" />,
    D: <Minus className="w-3 h-3 text-danger" />,
    '?': <FileQuestion className="w-3 h-3 text-secondary" />,
  };

  const statusCode = file.isStaged ? file.index : file.workingDir;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      onClick={onSelect}
      className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors group ${
        isSelected ? 'bg-accent-muted' : 'hover:bg-hover'
      }`}
    >
      {statusIcons[statusCode] || statusIcons['M']}
      <span className="flex-1 text-sm text-primary truncate font-mono">
        {file.path}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDiscard && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDiscard();
            }}
            className="p-1 rounded text-danger hover:bg-danger-muted transition-colors"
            title="Discard changes"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStage();
          }}
          className="p-1 rounded text-accent hover:bg-accent-muted transition-colors"
          title={actionTitle}
        >
          {actionIcon}
        </button>
      </div>
    </motion.div>
  );
}

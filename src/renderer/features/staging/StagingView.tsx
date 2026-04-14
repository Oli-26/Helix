import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Allotment } from 'allotment';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Minus,
  Edit3,
  FileQuestion,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Check,
  RotateCcw,
  X,
  CheckCircle2,
  Copy,
  FolderOpen,
  List,
  FolderTree,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useStatus } from '../../hooks/useStatus';
import { useUIStore, useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { DiffView } from '../diff/DiffView';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { FileStatus } from '../../../shared/git-types';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

// ─── File tree helpers ─────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FileStatus;
}

function buildFileTree(files: FileStatus[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join('/');
      const isDir = i < parts.length - 1;
      let node = current.find((n) => n.name === name && n.isDir === isDir);
      if (!node) {
        node = { name, path, isDir, children: [], file: isDir ? undefined : file };
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

// ─── Main component ────────────────────────────────────────────────

export function StagingView() {
  const repoPath = useRepoPath();
  const { data: files, isLoading } = useStatus(repoPath);
  const queryClient = useQueryClient();
  const [commitMessage, setCommitMessage] = useState('');
  const [amend, setAmend] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    path: string;
    staged: boolean;
  } | null>(null);
  const [treeMode, setTreeMode] = useState(false);

  // Multi-selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<
    'staged' | 'unstaged' | null
  >(null);
  const lastClickedRef = useRef<string | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string;
    danger?: boolean; confirmLabel?: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const closeModal = () => setConfirmModal((s) => ({ ...s, open: false }));

  // Drag state
  const [dragOverSection, setDragOverSection] = useState<'staged' | 'unstaged' | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Fetch last commit for amend
  const { data: lastLog } = useQuery({
    queryKey: ['git', 'log', repoPath, 1],
    queryFn: () => gitApi.getLog(repoPath!, 1),
    enabled: !!repoPath,
    staleTime: 10_000,
  });
  const lastCommitMessage = lastLog?.[0]?.subject || '';

  const toggleAmend = useCallback(() => {
    setAmend((prev) => {
      const next = !prev;
      if (next && lastCommitMessage) {
        setCommitMessage(lastCommitMessage);
      } else if (!next) {
        setCommitMessage('');
      }
      return next;
    });
  }, [lastCommitMessage]);

  const stagedFiles = files?.filter((f) => f.isStaged) || [];
  const unstagedFiles = files?.filter((f) => !f.isStaged) || [];

  const stagedTree = useMemo(() => buildFileTree(stagedFiles), [stagedFiles]);
  const unstagedTree = useMemo(() => buildFileTree(unstagedFiles), [unstagedFiles]);

  const stagedPaths = useMemo(
    () => stagedFiles.map((f) => f.path),
    [stagedFiles],
  );
  const unstagedPaths = useMemo(
    () => unstagedFiles.map((f) => f.path),
    [unstagedFiles],
  );

  const selectedPaths = useMemo(() => {
    const visible = activeSection === 'staged' ? stagedPaths : unstagedPaths;
    return [...selected].filter((p) => visible.includes(p));
  }, [selected, activeSection, stagedPaths, unstagedPaths]);

  const stageMutation = useMutation({
    mutationFn: (filePaths: string[]) => gitApi.stage(repoPath!, filePaths),
    onSuccess: (_d, paths) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] });
      toast.success('Staged', `${paths.length} file${paths.length > 1 ? 's' : ''}`);
    },
    onError: (err: any) => toast.error('Stage failed', err.message),
  });

  const unstageMutation = useMutation({
    mutationFn: (filePaths: string[]) =>
      gitApi.unstage(repoPath!, filePaths),
    onSuccess: (_d, paths) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] });
      toast.success('Unstaged', `${paths.length} file${paths.length > 1 ? 's' : ''}`);
    },
    onError: (err: any) => toast.error('Unstage failed', err.message),
  });

  const discardMutation = useMutation({
    mutationFn: (filePaths: string[]) =>
      gitApi.discardChanges(repoPath!, filePaths),
    onSuccess: (_d, paths) => {
      queryClient.invalidateQueries({ queryKey: ['git', 'status'] });
      toast.success('Discarded', `${paths.length} file${paths.length > 1 ? 's' : ''}`);
    },
    onError: (err: any) => toast.error('Discard failed', err.message),
  });

  const commitMutation = useMutation({
    mutationFn: () => gitApi.commit(repoPath!, commitMessage, amend),
    onSuccess: () => {
      setCommitMessage('');
      setAmend(false);
      queryClient.invalidateQueries({ queryKey: ['git'] });
      toast.success(amend ? 'Amended' : 'Committed');
    },
    onError: (err: any) => toast.error('Commit failed', err.message),
  });

  const stageAll = () => {
    const paths = unstagedFiles.map((f) => f.path);
    if (paths.length > 0) stageMutation.mutate(paths);
  };

  const unstageAll = () => {
    const paths = stagedFiles.map((f) => f.path);
    if (paths.length > 0) unstageMutation.mutate(paths);
  };

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setActiveSection(null);
  }, []);

  const confirmDiscard = useCallback((paths: string[]) => {
    setConfirmModal({
      open: true,
      title: 'Discard Changes',
      message: paths.length === 1
        ? `Discard all changes to "${paths[0]}"? This cannot be undone.`
        : `Discard changes to ${paths.length} files? This cannot be undone.`,
      danger: true,
      confirmLabel: 'Discard',
      onConfirm: () => { discardMutation.mutate(paths); clearSelection(); closeModal(); },
    });
  }, [discardMutation, clearSelection]);

  // Multi-select handler
  const handleSelect = useCallback(
    (path: string, staged: boolean, e: React.MouseEvent) => {
      const section = staged ? 'staged' : 'unstaged';
      const allPaths = staged ? stagedPaths : unstagedPaths;

      if (activeSection !== null && activeSection !== section) {
        setSelected(new Set([path]));
        setActiveSection(section);
        lastClickedRef.current = path;
        setPreviewFile({ path, staged });
        return;
      }

      if (e.shiftKey && lastClickedRef.current) {
        const startIdx = allPaths.indexOf(lastClickedRef.current);
        const endIdx = allPaths.indexOf(path);
        if (startIdx >= 0 && endIdx >= 0) {
          const from = Math.min(startIdx, endIdx);
          const to = Math.max(startIdx, endIdx);
          const range = allPaths.slice(from, to + 1);
          setSelected((prev) => {
            const next = new Set(prev);
            range.forEach((p) => next.add(p));
            return next;
          });
        }
      } else if (e.ctrlKey || e.metaKey) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      } else {
        setSelected(new Set([path]));
      }

      setActiveSection(section);
      lastClickedRef.current = path;
      setPreviewFile({ path, staged });
    },
    [activeSection, stagedPaths, unstagedPaths],
  );

  // Context menu handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: FileStatus, staged: boolean) => {
      e.preventDefault();
      e.stopPropagation();

      const section = staged ? 'staged' : 'unstaged';
      const isInSelection =
        selected.has(file.path) && activeSection === section;

      if (!isInSelection) {
        setSelected(new Set([file.path]));
        setActiveSection(section);
        setPreviewFile({ path: file.path, staged });
      }

      const targetPaths = isInSelection
        ? [...selected].filter((p) =>
            (staged ? stagedPaths : unstagedPaths).includes(p),
          )
        : [file.path];
      const count = targetPaths.length;
      const plural = count > 1;

      const items: ContextMenuItem[] = staged
        ? [
            { label: plural ? `Unstage ${count} Files` : 'Unstage', icon: <ChevronUp className="w-3.5 h-3.5" />, onClick: () => { unstageMutation.mutate(targetPaths); clearSelection(); } },
            { separator: true, label: '' },
            { label: plural ? 'Copy Paths' : 'Copy Path', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(targetPaths.join('\n')) },
          ]
        : [
            { label: plural ? `Stage ${count} Files` : 'Stage', icon: <ChevronDown className="w-3.5 h-3.5" />, onClick: () => { stageMutation.mutate(targetPaths); clearSelection(); } },
            { separator: true, label: '' },
            { label: plural ? `Discard ${count} Files` : 'Discard Changes', icon: <RotateCcw className="w-3.5 h-3.5" />, danger: true, onClick: () => confirmDiscard(targetPaths) },
            { separator: true, label: '' },
            { label: plural ? 'Copy Paths' : 'Copy Path', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => navigator.clipboard.writeText(targetPaths.join('\n')) },
          ];

      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - items.filter((i) => !i.separator).length * 36 - 16);
      setContextMenu({ x, y, items });
    },
    [selected, activeSection, stagedPaths, unstagedPaths, stageMutation, unstageMutation, discardMutation, clearSelection],
  );

  // Close context menu
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => { window.removeEventListener('click', handleClick); window.removeEventListener('keydown', handleEscape); };
  }, [contextMenu]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, paths: string[], staged: boolean) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ paths, staged }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, section: 'staged' | 'unstaged') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(section);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSection(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSection: 'staged' | 'unstaged') => {
    e.preventDefault();
    setDragOverSection(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { paths, staged } = data as { paths: string[]; staged: boolean };
      // Only act if dropping in the opposite section
      if (staged && targetSection === 'unstaged') {
        unstageMutation.mutate(paths);
      } else if (!staged && targetSection === 'staged') {
        stageMutation.mutate(paths);
      }
    } catch { /* ignore */ }
  }, [stageMutation, unstageMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        Loading status...
      </div>
    );
  }

  const renderFileList = (fileList: FileStatus[], tree: TreeNode[], staged: boolean) => {
    if (treeMode) {
      return tree.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          staged={staged}
          selected={selected}
          activeSection={activeSection}
          onSelect={handleSelect}
          onStage={staged ? unstageMutation : stageMutation}
          onDiscard={staged ? undefined : discardMutation}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
          actionIcon={staged ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          actionTitle={staged ? 'Unstage' : 'Stage'}
          depth={0}
        />
      ));
    }
    return (
      <AnimatePresence>
        {fileList.map((file) => (
          <FileRow
            key={file.path}
            file={file}
            isSelected={selected.has(file.path) && activeSection === (staged ? 'staged' : 'unstaged')}
            onSelect={(e) => handleSelect(file.path, staged, e)}
            onStage={() => (staged ? unstageMutation : stageMutation).mutate([file.path])}
            onDiscard={staged ? undefined : () => confirmDiscard([file.path])}
            onContextMenu={(e) => handleContextMenu(e, file, staged)}
            onDragStart={(e) => handleDragStart(e, [file.path], staged)}
            actionIcon={staged ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            actionTitle={staged ? 'Unstage' : 'Stage'}
          />
        ))}
      </AnimatePresence>
    );
  };

  return (
    <Allotment>
      <Allotment.Pane minSize={250} preferredSize={350}>
        <div className="h-full flex flex-col bg-primary">
          {/* Unstaged changes */}
          <div
            className={`flex-1 overflow-hidden flex flex-col transition-colors ${dragOverSection === 'staged' ? '' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'unstaged')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'unstaged')}
          >
            <SectionHeader
              title="Unstaged Changes"
              count={unstagedFiles.length}
              action={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTreeMode(!treeMode)}
                    className="text-xs text-tertiary hover:text-primary transition-colors"
                    title={treeMode ? 'Flat list' : 'Tree view'}
                  >
                    {treeMode ? <List className="w-3 h-3" /> : <FolderTree className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={stageAll}
                    className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                    title="Stage all"
                  >
                    <ChevronDown className="w-3 h-3" />
                    Stage All
                  </button>
                </div>
              }
            />

            <AnimatePresence>
              {activeSection === 'unstaged' && selectedPaths.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-accent-muted border-b border-default">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs text-accent font-medium">{selectedPaths.length} selected</span>
                    <button
                      onClick={() => { setSelected(new Set(unstagedPaths)); setActiveSection('unstaged'); }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-tertiary hover:text-primary hover:bg-hover transition-colors"
                      title="Select all"
                    >
                      <CheckSquare className="w-3 h-3" /> All
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => { stageMutation.mutate(selectedPaths); clearSelection(); }} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent-muted text-accent hover:bg-accent hover:text-text-inverse transition-colors">
                      <ChevronDown className="w-3 h-3" /> Stage
                    </button>
                    <button onClick={() => confirmDiscard(selectedPaths)} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-danger-muted text-danger hover:bg-danger hover:text-white transition-colors">
                      <RotateCcw className="w-3 h-3" /> Discard
                    </button>
                    <button onClick={clearSelection} className="p-0.5 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors" title="Deselect"><X className="w-3 h-3" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`flex-1 overflow-y-auto ${dragOverSection === 'unstaged' ? 'ring-2 ring-inset ring-accent/40 bg-accent/5' : ''}`}>
              {renderFileList(unstagedFiles, unstagedTree, false)}
              {unstagedFiles.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-tertiary">
                  No unstaged changes
                </div>
              )}
            </div>
          </div>

          {/* Staged changes */}
          <div
            className="flex-1 overflow-hidden flex flex-col border-t border-default"
            onDragOver={(e) => handleDragOver(e, 'staged')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'staged')}
          >
            <SectionHeader
              title="Staged Changes"
              count={stagedFiles.length}
              action={
                <button onClick={unstageAll} className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1" title="Unstage all">
                  <ChevronUp className="w-3 h-3" /> Unstage All
                </button>
              }
            />

            <AnimatePresence>
              {activeSection === 'staged' && selectedPaths.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-accent-muted border-b border-default">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs text-accent font-medium">{selectedPaths.length} selected</span>
                    <button
                      onClick={() => { setSelected(new Set(stagedPaths)); setActiveSection('staged'); }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-tertiary hover:text-primary hover:bg-hover transition-colors"
                      title="Select all"
                    >
                      <CheckSquare className="w-3 h-3" /> All
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => { unstageMutation.mutate(selectedPaths); clearSelection(); }} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent-muted text-accent hover:bg-accent hover:text-text-inverse transition-colors">
                      <ChevronUp className="w-3 h-3" /> Unstage
                    </button>
                    <button onClick={clearSelection} className="p-0.5 rounded text-tertiary hover:text-primary hover:bg-hover transition-colors" title="Deselect"><X className="w-3 h-3" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`flex-1 overflow-y-auto ${dragOverSection === 'staged' ? 'ring-2 ring-inset ring-accent/40 bg-accent/5' : ''}`}>
              {renderFileList(stagedFiles, stagedTree, true)}
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
              placeholder={amend ? 'Amend commit message...' : 'Commit message...'}
              className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder:text-placeholder resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              rows={3}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && (amend || stagedFiles.length > 0) && commitMessage.trim()) {
                  commitMutation.mutate();
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={amend} onChange={toggleAmend} className="w-3.5 h-3.5 rounded border-default accent-[var(--color-accent)] cursor-pointer" />
                  <span className="text-xs text-secondary">Amend</span>
                </label>
                <span className="text-xs text-tertiary">
                  {commitMessage.length > 0 ? `${commitMessage.split('\n')[0].length}/72 chars` : 'Ctrl+Enter to commit'}
                </span>
              </div>
              <button
                onClick={() => commitMutation.mutate()}
                disabled={(!amend && stagedFiles.length === 0) || !commitMessage.trim() || commitMutation.isPending}
                className="flex items-center gap-2 px-4 py-1.5 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" />
                {commitMutation.isPending ? 'Committing...' : amend ? 'Amend' : 'Commit'}
              </button>
            </div>
          </div>
        </div>

        {/* Context menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
              className="fixed z-[200] min-w-[200px] bg-popover border border-default rounded-lg py-1 overflow-hidden"
              style={{ left: contextMenu.x, top: contextMenu.y, boxShadow: 'var(--shadow-lg)' }}
            >
              {contextMenu.items.map((item, index) => {
                if (item.separator) return <div key={`sep-${index}`} className="h-px bg-[var(--color-border)] my-1 mx-2" />;
                return (
                  <button key={item.label} onClick={() => { if (!item.disabled) { item.onClick?.(); setContextMenu(null); } }} disabled={item.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-1.5 text-[13px] transition-colors text-left ${item.disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'} ${item.danger ? 'text-danger hover:bg-danger-muted' : 'text-primary hover:bg-hover'}`}>
                    {item.icon && <span className="w-4 h-4 flex items-center justify-center text-secondary flex-shrink-0">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm modal */}
        <ConfirmModal
          open={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeModal}
        />
      </Allotment.Pane>

      <Allotment.Pane>
        {previewFile ? (
          <DiffView filePath={previewFile.path} staged={previewFile.staged} enableLineStaging />
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

// ─── Section header ────────────────────────────────────────────────

function SectionHeader({ title, count, action }: { title: string; count: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary flex-shrink-0">
      <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
        {title} <span className="text-tertiary font-normal">({count})</span>
      </span>
      {action}
    </div>
  );
}

// ─── File tree node (recursive) ────────────────────────────────────

function FileTreeNode({
  node,
  staged,
  selected,
  activeSection,
  onSelect,
  onStage,
  onDiscard,
  onContextMenu,
  onDragStart,
  actionIcon,
  actionTitle,
  depth,
}: {
  node: TreeNode;
  staged: boolean;
  selected: Set<string>;
  activeSection: 'staged' | 'unstaged' | null;
  onSelect: (path: string, staged: boolean, e: React.MouseEvent) => void;
  onStage: { mutate: (paths: string[]) => void };
  onDiscard?: { mutate: (paths: string[]) => void };
  onContextMenu: (e: React.MouseEvent, file: FileStatus, staged: boolean) => void;
  onDragStart: (e: React.DragEvent, paths: string[], staged: boolean) => void;
  actionIcon: React.ReactNode;
  actionTitle: string;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.isDir) {
    const allFilePaths = getAllFilePaths(node);
    return (
      <div>
        <div
          className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-hover transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.1 }}>
            <ChevronRight className="w-3 h-3 text-tertiary" />
          </motion.div>
          <FolderOpen className="w-3 h-3 text-accent" />
          <span className="text-xs text-primary flex-1 truncate">{node.name}</span>
          <span className="text-[10px] text-tertiary">{allFilePaths.length}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onStage.mutate(allFilePaths); }}
            className="p-0.5 rounded text-accent hover:bg-accent-muted transition-colors opacity-0 group-hover:opacity-100"
            title={`${actionTitle} folder`}
          >
            {actionIcon}
          </button>
        </div>
        {isOpen && node.children.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            staged={staged}
            selected={selected}
            activeSection={activeSection}
            onSelect={onSelect}
            onStage={onStage}
            onDiscard={onDiscard}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            actionIcon={actionIcon}
            actionTitle={actionTitle}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  const file = node.file!;
  const section = staged ? 'staged' : 'unstaged';
  const isSelected = selected.has(file.path) && activeSection === section;
  const statusCode = file.isStaged ? file.index : file.workingDir;
  const statusIcons: Record<string, React.ReactNode> = {
    M: <Edit3 className="w-3 h-3 text-warning" />,
    A: <Plus className="w-3 h-3 text-success" />,
    D: <Minus className="w-3 h-3 text-danger" />,
    '?': <FileQuestion className="w-3 h-3 text-secondary" />,
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, [file.path], staged)}
      onClick={(e) => onSelect(file.path, staged, e)}
      onContextMenu={(e) => onContextMenu(e, file, staged)}
      className={`flex items-center gap-2 py-1 pr-2 cursor-pointer transition-colors group ${
        isSelected ? 'bg-accent-muted ring-1 ring-inset ring-accent/30' : 'hover:bg-hover'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {statusIcons[statusCode] || statusIcons['M']}
      <span className="flex-1 text-xs text-primary truncate font-mono">{node.name}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDiscard && (
          <button onClick={(e) => { e.stopPropagation(); onDiscard.mutate([file.path]); }} className="p-0.5 rounded text-danger hover:bg-danger-muted transition-colors" title="Discard">
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onStage.mutate([file.path]); }} className="p-0.5 rounded text-accent hover:bg-accent-muted transition-colors" title={actionTitle}>
          {actionIcon}
        </button>
      </div>
    </div>
  );
}

function getAllFilePaths(node: TreeNode): string[] {
  if (!node.isDir && node.file) return [node.file.path];
  return node.children.flatMap(getAllFilePaths);
}

// ─── Flat file row ─────────────────────────────────────────────────

function FileRow({
  file,
  isSelected,
  onSelect,
  onStage,
  onDiscard,
  onContextMenu,
  onDragStart,
  actionIcon,
  actionTitle,
}: {
  file: FileStatus;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onStage: () => void;
  onDiscard?: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
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
    <div draggable onDragStart={onDragStart}>
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        onClick={onSelect}
        onContextMenu={onContextMenu}
        className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors group ${
          isSelected ? 'bg-accent-muted ring-1 ring-inset ring-accent/30' : 'hover:bg-hover'
        }`}
      >
        {statusIcons[statusCode] || statusIcons['M']}
        <span className="flex-1 text-sm text-primary truncate font-mono">{file.path}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDiscard && (
            <button onClick={(e) => { e.stopPropagation(); onDiscard(); }} className="p-1 rounded text-danger hover:bg-danger-muted transition-colors" title="Discard changes">
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onStage(); }} className="p-1 rounded text-accent hover:bg-accent-muted transition-colors" title={actionTitle}>
            {actionIcon}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

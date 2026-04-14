import { useState, useCallback } from 'react';
import type { DiffFile, DiffHunk, DiffLine } from '../../../shared/git-types';

interface UnifiedDiffProps {
  file: DiffFile;
  onStageHunk?: (hunkIndex: number) => void;
  onDiscardHunk?: (hunkIndex: number) => void;
  onStageLines?: (selectedLines: Set<string>) => void;
  enableLineSelection?: boolean;
}

export function UnifiedDiff({ file, onStageHunk, onDiscardHunk, onStageLines, enableLineSelection }: UnifiedDiffProps) {
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  const toggleLine = useCallback((lineKey: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineKey)) {
        next.delete(lineKey);
      } else {
        next.add(lineKey);
      }
      return next;
    });
  }, []);

  const hasSelection = selectedLines.size > 0;

  const handleStageSelected = () => {
    if (onStageLines && hasSelection) {
      onStageLines(selectedLines);
      setSelectedLines(new Set());
    }
  };

  return (
    <div className="font-mono text-xs leading-5 overflow-x-auto">
      {enableLineSelection && hasSelection && (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-accent-muted border-b border-accent/20">
          <span className="text-xs text-accent font-medium">
            {selectedLines.size} line{selectedLines.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleStageSelected}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-[var(--color-text-inverse)] hover:opacity-90 transition-colors"
          >
            Stage Selected
          </button>
          <button
            onClick={() => setSelectedLines(new Set())}
            className="px-2 py-0.5 rounded text-[10px] font-medium text-secondary hover:text-primary hover:bg-hover transition-colors"
          >
            Clear
          </button>
        </div>
      )}
      <table className="w-full border-collapse">
        <tbody>
          {file.hunks.map((hunk, hunkIndex) => (
            <HunkSection
              key={hunkIndex}
              hunk={hunk}
              hunkIndex={hunkIndex}
              onStage={onStageHunk ? () => onStageHunk(hunkIndex) : undefined}
              onDiscard={onDiscardHunk ? () => onDiscardHunk(hunkIndex) : undefined}
              enableLineSelection={enableLineSelection}
              selectedLines={selectedLines}
              onToggleLine={toggleLine}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HunkSection({
  hunk,
  hunkIndex,
  onStage,
  onDiscard,
  enableLineSelection,
  selectedLines,
  onToggleLine,
}: {
  hunk: DiffHunk;
  hunkIndex: number;
  onStage?: () => void;
  onDiscard?: () => void;
  enableLineSelection?: boolean;
  selectedLines?: Set<string>;
  onToggleLine?: (lineKey: string) => void;
}) {
  return (
    <>
      {/* Hunk header */}
      <tr className="bg-[var(--color-diff-hunk-bg)]">
        <td
          colSpan={enableLineSelection ? 4 : 3}
          className="px-4 py-1.5 text-accent select-none"
        >
          <div className="flex items-center justify-between">
            <span className="opacity-75">{hunk.header}</span>
            {(onStage || onDiscard) && (
              <div className="flex items-center gap-2">
                {onStage && (
                  <button
                    onClick={onStage}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-muted text-accent hover:bg-accent hover:text-[var(--color-text-inverse)] transition-colors"
                  >
                    Stage Hunk
                  </button>
                )}
                {onDiscard && (
                  <button
                    onClick={onDiscard}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-danger-muted text-danger hover:bg-danger hover:text-white transition-colors"
                  >
                    Discard Hunk
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Lines */}
      {hunk.lines.map((line, lineIndex) => {
        const lineKey = `${hunkIndex}-${lineIndex}`;
        return (
          <DiffLineRow
            key={lineKey}
            line={line}
            lineKey={lineKey}
            enableSelection={enableLineSelection && line.type !== 'context'}
            isSelected={selectedLines?.has(lineKey) ?? false}
            onToggle={onToggleLine}
          />
        );
      })}
    </>
  );
}

function DiffLineRow({
  line,
  lineKey,
  enableSelection,
  isSelected,
  onToggle,
}: {
  line: DiffLine;
  lineKey: string;
  enableSelection?: boolean;
  isSelected?: boolean;
  onToggle?: (lineKey: string) => void;
}) {
  const bgClass =
    line.type === 'add'
      ? isSelected ? 'bg-[var(--color-diff-add-bg)] brightness-125' : 'bg-[var(--color-diff-add-bg)]'
      : line.type === 'delete'
        ? isSelected ? 'bg-[var(--color-diff-del-bg)] brightness-125' : 'bg-[var(--color-diff-del-bg)]'
        : '';

  const lineNumClass = 'px-2 py-0 text-right select-none w-[1%] whitespace-nowrap text-[var(--color-text-tertiary)] border-r border-[var(--color-border-subtle)]';

  const prefix =
    line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' ';

  const contentClass =
    line.type === 'add'
      ? 'text-[var(--color-success)]'
      : line.type === 'delete'
        ? 'text-[var(--color-danger)]'
        : 'text-[var(--color-text-primary)]';

  return (
    <tr
      className={`${bgClass} hover:brightness-110 transition-all ${enableSelection ? 'cursor-pointer' : ''}`}
      onClick={enableSelection ? () => onToggle?.(lineKey) : undefined}
    >
      {enableSelection !== undefined && (
        <td className="w-[1%] px-1 py-0 text-center select-none">
          {enableSelection && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle?.(lineKey)}
              onClick={(e) => e.stopPropagation()}
              className="w-3 h-3 accent-[var(--color-accent)] cursor-pointer"
            />
          )}
        </td>
      )}
      <td className={lineNumClass}>
        {line.type !== 'add' ? line.oldLineNumber : ''}
      </td>
      <td className={lineNumClass}>
        {line.type !== 'delete' ? line.newLineNumber : ''}
      </td>
      <td className={`pl-4 pr-8 py-0 whitespace-pre ${contentClass}`}>
        <span className="select-none opacity-50 mr-2">{prefix}</span>
        {line.content}
      </td>
    </tr>
  );
}

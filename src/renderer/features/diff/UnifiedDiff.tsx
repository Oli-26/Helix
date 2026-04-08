import type { DiffFile, DiffHunk, DiffLine } from '../../../shared/git-types';

interface UnifiedDiffProps {
  file: DiffFile;
  onStageHunk?: (hunkIndex: number) => void;
  onDiscardHunk?: (hunkIndex: number) => void;
}

export function UnifiedDiff({ file, onStageHunk, onDiscardHunk }: UnifiedDiffProps) {
  return (
    <div className="font-mono text-xs leading-5 overflow-x-auto">
      <table className="w-full border-collapse">
        <tbody>
          {file.hunks.map((hunk, hunkIndex) => (
            <HunkSection
              key={hunkIndex}
              hunk={hunk}
              hunkIndex={hunkIndex}
              onStage={onStageHunk ? () => onStageHunk(hunkIndex) : undefined}
              onDiscard={onDiscardHunk ? () => onDiscardHunk(hunkIndex) : undefined}
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
}: {
  hunk: DiffHunk;
  hunkIndex: number;
  onStage?: () => void;
  onDiscard?: () => void;
}) {
  return (
    <>
      {/* Hunk header */}
      <tr className="bg-[var(--color-diff-hunk-bg)]">
        <td
          colSpan={3}
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
      {hunk.lines.map((line, lineIndex) => (
        <DiffLineRow key={`${hunkIndex}-${lineIndex}`} line={line} />
      ))}
    </>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const bgClass =
    line.type === 'add'
      ? 'bg-[var(--color-diff-add-bg)]'
      : line.type === 'delete'
        ? 'bg-[var(--color-diff-del-bg)]'
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
    <tr className={`${bgClass} hover:brightness-110 transition-all`}>
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

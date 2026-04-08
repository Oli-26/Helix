import type { DiffFile, DiffHunk, DiffLine } from '../../../shared/git-types';

interface SplitDiffProps {
  file: DiffFile;
}

export function SplitDiff({ file }: SplitDiffProps) {
  return (
    <div className="font-mono text-xs leading-5 overflow-x-auto">
      <table className="w-full border-collapse">
        <tbody>
          {file.hunks.map((hunk, hunkIndex) => (
            <SplitHunkSection key={hunkIndex} hunk={hunk} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

function buildSplitRows(hunk: DiffHunk): SplitRow[] {
  const rows: SplitRow[] = [];
  const lines = hunk.lines;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'context') {
      rows.push({ left: line, right: line });
      i++;
    } else if (line.type === 'delete') {
      // Collect consecutive deletes and adds to pair them
      const deletes: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'delete') {
        deletes.push(lines[i]);
        i++;
      }
      const adds: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'add') {
        adds.push(lines[i]);
        i++;
      }
      const maxLen = Math.max(deletes.length, adds.length);
      for (let j = 0; j < maxLen; j++) {
        rows.push({
          left: j < deletes.length ? deletes[j] : null,
          right: j < adds.length ? adds[j] : null,
        });
      }
    } else if (line.type === 'add') {
      rows.push({ left: null, right: line });
      i++;
    } else {
      i++;
    }
  }

  return rows;
}

function SplitHunkSection({ hunk }: { hunk: DiffHunk }) {
  const rows = buildSplitRows(hunk);

  return (
    <>
      {/* Hunk header */}
      <tr className="bg-[var(--color-diff-hunk-bg)]">
        <td colSpan={4} className="px-4 py-1.5 text-accent opacity-75 select-none">
          {hunk.header}
        </td>
      </tr>

      {rows.map((row, idx) => (
        <tr key={idx}>
          {/* Left side (old) */}
          <td className="px-2 py-0 text-right select-none w-[1%] whitespace-nowrap text-[var(--color-text-tertiary)] border-r border-[var(--color-border-subtle)]">
            {row.left?.oldLineNumber ?? ''}
          </td>
          <td
            className={`pl-4 pr-4 py-0 whitespace-pre w-1/2 border-r border-[var(--color-border-subtle)] ${
              row.left?.type === 'delete'
                ? 'bg-[var(--color-diff-del-bg)] text-[var(--color-danger)]'
                : row.left === null
                  ? 'bg-[var(--color-bg-tertiary)]'
                  : 'text-[var(--color-text-primary)]'
            }`}
          >
            {row.left ? (
              <>
                <span className="select-none opacity-50 mr-2">
                  {row.left.type === 'delete' ? '-' : ' '}
                </span>
                {row.left.content}
              </>
            ) : null}
          </td>

          {/* Right side (new) */}
          <td className="px-2 py-0 text-right select-none w-[1%] whitespace-nowrap text-[var(--color-text-tertiary)] border-r border-[var(--color-border-subtle)]">
            {row.right?.newLineNumber ?? ''}
          </td>
          <td
            className={`pl-4 pr-4 py-0 whitespace-pre w-1/2 ${
              row.right?.type === 'add'
                ? 'bg-[var(--color-diff-add-bg)] text-[var(--color-success)]'
                : row.right === null
                  ? 'bg-[var(--color-bg-tertiary)]'
                  : 'text-[var(--color-text-primary)]'
            }`}
          >
            {row.right ? (
              <>
                <span className="select-none opacity-50 mr-2">
                  {row.right.type === 'add' ? '+' : ' '}
                </span>
                {row.right.content}
              </>
            ) : null}
          </td>
        </tr>
      ))}
    </>
  );
}

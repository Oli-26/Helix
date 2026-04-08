import type { DiffFile, DiffHunk, DiffLine } from '../../shared/git-types';

export function parseUnifiedDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileSections = raw.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split('\n');
    const headerLine = lines[0] || '';

    // Parse file paths from "a/path b/path"
    const pathMatch = headerLine.match(/^a\/(.+?) b\/(.+)$/);
    const oldPath = pathMatch?.[1] || '';
    const newPath = pathMatch?.[2] || '';

    // Determine status
    let status: DiffFile['status'] = 'modified';
    if (lines.some((l) => l.startsWith('new file'))) {
      status = 'added';
    } else if (lines.some((l) => l.startsWith('deleted file'))) {
      status = 'deleted';
    } else if (lines.some((l) => l.startsWith('rename from'))) {
      status = 'renamed';
    }

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      const hunkHeader = line.match(
        /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/,
      );

      if (hunkHeader) {
        currentHunk = {
          header: line,
          oldStart: parseInt(hunkHeader[1], 10),
          oldLines: parseInt(hunkHeader[2] || '1', 10),
          newStart: parseInt(hunkHeader[3], 10),
          newLines: parseInt(hunkHeader[4] || '1', 10),
          lines: [],
        };
        hunks.push(currentHunk);
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber:
            currentHunk.newStart +
            currentHunk.lines.filter(
              (l) => l.type === 'add' || l.type === 'context',
            ).length,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
        currentHunk.lines.push({
          type: 'delete',
          content: line.slice(1),
          oldLineNumber:
            currentHunk.oldStart +
            currentHunk.lines.filter(
              (l) => l.type === 'delete' || l.type === 'context',
            ).length,
        });
      } else if (line.startsWith(' ')) {
        const contextLineCount = currentHunk.lines.filter(
          (l) => l.type === 'context',
        ).length;
        const addCount = currentHunk.lines.filter(
          (l) => l.type === 'add',
        ).length;
        const delCount = currentHunk.lines.filter(
          (l) => l.type === 'delete',
        ).length;
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: currentHunk.oldStart + contextLineCount + delCount,
          newLineNumber: currentHunk.newStart + contextLineCount + addCount,
        });
      }
    }

    files.push({
      oldPath,
      newPath,
      status,
      hunks,
      stats: { additions, deletions },
    });
  }

  return files;
}

import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff } from '../../src/main/git/git-diff-parser';

describe('parseUnifiedDiff', () => {
  it('returns empty array for empty input', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
  });

  it('parses a simple modified file', () => {
    const raw = `diff --git a/src/app.ts b/src/app.ts
index 1234567..abcdefg 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 import { foo } from 'bar';
+import { baz } from 'qux';

 export function main() {
`;
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].oldPath).toBe('src/app.ts');
    expect(files[0].newPath).toBe('src/app.ts');
    expect(files[0].status).toBe('modified');
    expect(files[0].stats).toEqual({ additions: 1, deletions: 0 });
    expect(files[0].hunks).toHaveLength(1);
    expect(files[0].hunks[0].oldStart).toBe(1);
    expect(files[0].hunks[0].oldLines).toBe(3);
    expect(files[0].hunks[0].newStart).toBe(1);
    expect(files[0].hunks[0].newLines).toBe(4);
  });

  it('detects added file status', () => {
    const raw = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+export const x = 1;
+export const y = 2;
+export const z = 3;
`;
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe('added');
    expect(files[0].stats).toEqual({ additions: 3, deletions: 0 });
  });

  it('detects deleted file status', () => {
    const raw = `diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index 1234567..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const x = 1;
-export const y = 2;
`;
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe('deleted');
    expect(files[0].stats).toEqual({ additions: 0, deletions: 2 });
  });

  it('detects renamed file status', () => {
    const raw = `diff --git a/old-name.ts b/new-name.ts
rename from old-name.ts
rename to new-name.ts
similarity index 100%
`;
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].status).toBe('renamed');
    expect(files[0].oldPath).toBe('old-name.ts');
    expect(files[0].newPath).toBe('new-name.ts');
  });

  it('parses multiple files', () => {
    const raw = `diff --git a/file1.ts b/file1.ts
index 1234567..abcdefg 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 const c = 3;
diff --git a/file2.ts b/file2.ts
index 1234567..abcdefg 100644
--- a/file2.ts
+++ b/file2.ts
@@ -5,3 +5,2 @@
 line5
-line6
 line7
`;
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(2);
    expect(files[0].newPath).toBe('file1.ts');
    expect(files[0].stats).toEqual({ additions: 1, deletions: 0 });
    expect(files[1].newPath).toBe('file2.ts');
    expect(files[1].stats).toEqual({ additions: 0, deletions: 1 });
  });

  it('parses multiple hunks in a single file', () => {
    const raw = `diff --git a/big.ts b/big.ts
index 1234567..abcdefg 100644
--- a/big.ts
+++ b/big.ts
@@ -1,3 +1,4 @@
 line1
+inserted
 line2
 line3
@@ -10,3 +11,2 @@
 line10
-removed
 line12
`;
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].hunks).toHaveLength(2);
    expect(files[0].hunks[0].oldStart).toBe(1);
    expect(files[0].hunks[1].oldStart).toBe(10);
    expect(files[0].stats).toEqual({ additions: 1, deletions: 1 });
  });

  it('correctly assigns line numbers to context lines', () => {
    const raw = `diff --git a/foo.ts b/foo.ts
--- a/foo.ts
+++ b/foo.ts
@@ -5,4 +5,5 @@
 context1
+added
 context2
 context3
 context4
`;
    const files = parseUnifiedDiff(raw);
    const lines = files[0].hunks[0].lines;
    expect(lines[0].type).toBe('context');
    expect(lines[0].oldLineNumber).toBe(5);
    expect(lines[0].newLineNumber).toBe(5);
    expect(lines[1].type).toBe('add');
    expect(lines[1].newLineNumber).toBe(6);
    expect(lines[2].type).toBe('context');
    expect(lines[2].oldLineNumber).toBe(6);
    expect(lines[2].newLineNumber).toBe(7);
  });

  it('correctly assigns line numbers to deleted lines', () => {
    const raw = `diff --git a/foo.ts b/foo.ts
--- a/foo.ts
+++ b/foo.ts
@@ -10,4 +10,3 @@
 context
-deleted
 context2
 context3
`;
    const files = parseUnifiedDiff(raw);
    const lines = files[0].hunks[0].lines;
    expect(lines[1].type).toBe('delete');
    expect(lines[1].oldLineNumber).toBe(11);
  });

  it('strips leading +/- from line content', () => {
    const raw = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,2 +1,2 @@
-old content
+new content
`;
    const files = parseUnifiedDiff(raw);
    const lines = files[0].hunks[0].lines;
    expect(lines[0].content).toBe('old content');
    expect(lines[1].content).toBe('new content');
  });

  it('ignores --- and +++ header lines', () => {
    const raw = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,1 +1,1 @@
-old
+new
`;
    const files = parseUnifiedDiff(raw);
    // --- and +++ should NOT be treated as add/delete lines
    expect(files[0].stats).toEqual({ additions: 1, deletions: 1 });
  });

  it('handles hunk header with no line count (single line)', () => {
    const raw = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1 @@
-old
+new
`;
    const files = parseUnifiedDiff(raw);
    expect(files[0].hunks[0].oldLines).toBe(1);
    expect(files[0].hunks[0].newLines).toBe(1);
  });

  it('handles files with paths containing spaces', () => {
    const raw = `diff --git a/my file.ts b/my file.ts
--- a/my file.ts
+++ b/my file.ts
@@ -1,1 +1,1 @@
-old
+new
`;
    const files = parseUnifiedDiff(raw);
    expect(files[0].newPath).toBe('my file.ts');
  });
});

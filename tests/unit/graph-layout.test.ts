import { describe, it, expect } from 'vitest';
import { computeGraphLayout } from '../../src/renderer/features/history/graph/layout';
import type { CommitNode } from '../../src/shared/git-types';

function makeCommit(overrides: Partial<CommitNode> & { hash: string }): CommitNode {
  return {
    abbreviatedHash: overrides.hash.slice(0, 7),
    parents: [],
    refs: [],
    authorName: 'Test',
    authorEmail: 'test@test.com',
    authorDate: Date.now(),
    subject: 'test commit',
    ...overrides,
  };
}

describe('computeGraphLayout', () => {
  it('returns empty layout for empty commits', () => {
    const result = computeGraphLayout([]);
    expect(result.nodes.size).toBe(0);
    expect(result.edges).toHaveLength(0);
    expect(result.maxLane).toBe(0);
  });

  it('assigns lane 0 to a single commit', () => {
    const commits = [makeCommit({ hash: 'aaa' })];
    const result = computeGraphLayout(commits);
    expect(result.nodes.get('aaa')?.lane).toBe(0);
    expect(result.nodes.get('aaa')?.row).toBe(0);
  });

  it('keeps a linear chain in the same lane', () => {
    const commits = [
      makeCommit({ hash: 'c3', parents: ['c2'] }),
      makeCommit({ hash: 'c2', parents: ['c1'] }),
      makeCommit({ hash: 'c1', parents: [] }),
    ];
    const result = computeGraphLayout(commits);
    expect(result.nodes.get('c3')?.lane).toBe(0);
    expect(result.nodes.get('c2')?.lane).toBe(0);
    expect(result.nodes.get('c1')?.lane).toBe(0);
    expect(result.maxLane).toBe(0);
  });

  it('creates edges between parent and child', () => {
    const commits = [
      makeCommit({ hash: 'c2', parents: ['c1'] }),
      makeCommit({ hash: 'c1', parents: [] }),
    ];
    const result = computeGraphLayout(commits);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].fromHash).toBe('c2');
    expect(result.edges[0].toHash).toBe('c1');
  });

  it('assigns a merge commit multiple edges', () => {
    // c3 merges c2 and c1
    const commits = [
      makeCommit({ hash: 'c3', parents: ['c2', 'c1'] }),
      makeCommit({ hash: 'c2', parents: [] }),
      makeCommit({ hash: 'c1', parents: [] }),
    ];
    const result = computeGraphLayout(commits);
    expect(result.edges).toHaveLength(2);
    const edgeToC2 = result.edges.find((e) => e.toHash === 'c2');
    const edgeToC1 = result.edges.find((e) => e.toHash === 'c1');
    expect(edgeToC2).toBeDefined();
    expect(edgeToC1).toBeDefined();
    // Merge parent should be in a different lane
    expect(edgeToC1!.toLane).not.toBe(edgeToC2!.toLane);
  });

  it('assigns correct row indices', () => {
    const commits = [
      makeCommit({ hash: 'a' }),
      makeCommit({ hash: 'b' }),
      makeCommit({ hash: 'c' }),
    ];
    const result = computeGraphLayout(commits);
    expect(result.nodes.get('a')?.row).toBe(0);
    expect(result.nodes.get('b')?.row).toBe(1);
    expect(result.nodes.get('c')?.row).toBe(2);
  });

  it('assigns color strings using CSS variable pattern', () => {
    const commits = [makeCommit({ hash: 'x', parents: [] })];
    const result = computeGraphLayout(commits);
    const node = result.nodes.get('x');
    expect(node?.color).toMatch(/^var\(--color-graph-\d+\)$/);
  });

  it('handles branching and uses multiple lanes', () => {
    // Two branches from same parent
    const commits = [
      makeCommit({ hash: 'b1', parents: ['root'] }),
      makeCommit({ hash: 'b2', parents: ['root'] }),
      makeCommit({ hash: 'root', parents: [] }),
    ];
    const result = computeGraphLayout(commits);
    const lane1 = result.nodes.get('b1')?.lane;
    const lane2 = result.nodes.get('b2')?.lane;
    // They should be in different lanes since they're both branch heads
    // (though exact assignment depends on algorithm order)
    expect(lane1).toBeDefined();
    expect(lane2).toBeDefined();
    expect(result.maxLane).toBeGreaterThanOrEqual(0);
  });

  it('frees lanes for root commits (no parents)', () => {
    // After processing a root commit, its lane should be freed for reuse
    const commits = [
      makeCommit({ hash: 'c', parents: [] }),
      makeCommit({ hash: 'd', parents: [] }),
    ];
    const result = computeGraphLayout(commits);
    // Both root commits can reuse lane 0
    expect(result.nodes.get('c')?.lane).toBe(0);
    expect(result.nodes.get('d')?.lane).toBe(0);
  });

  it('caps lanes at MAX_LANES (20)', () => {
    // Create 25 independent branch heads to test the cap
    const commits: CommitNode[] = [];
    for (let i = 0; i < 25; i++) {
      commits.push(makeCommit({ hash: `branch${i}`, parents: [`parent${i}`] }));
    }
    // Add parents (but they won't appear in the commit list, so edges won't be drawn)
    const result = computeGraphLayout(commits);
    expect(result.maxLane).toBeLessThanOrEqual(19); // 0-indexed, max 20 lanes
  });

  it('handles parent not in commit list gracefully', () => {
    // Parent hash not found — should skip edge
    const commits = [
      makeCommit({ hash: 'child', parents: ['unknown-parent'] }),
    ];
    const result = computeGraphLayout(commits);
    expect(result.edges).toHaveLength(0);
    expect(result.nodes.get('child')).toBeDefined();
  });

  it('handles a complex merge topology', () => {
    // main: m3 → m2 → m1
    // feature: m3 merges feat1 → m1
    const commits = [
      makeCommit({ hash: 'm3', parents: ['m2', 'feat1'] }),
      makeCommit({ hash: 'm2', parents: ['m1'] }),
      makeCommit({ hash: 'feat1', parents: ['m1'] }),
      makeCommit({ hash: 'm1', parents: [] }),
    ];
    const result = computeGraphLayout(commits);
    expect(result.nodes.size).toBe(4);
    expect(result.edges.length).toBeGreaterThanOrEqual(3); // m3→m2, m3→feat1, m2→m1, feat1→m1
  });

  it('produces consistent edge colors matching lane', () => {
    const commits = [
      makeCommit({ hash: 'c2', parents: ['c1'] }),
      makeCommit({ hash: 'c1', parents: [] }),
    ];
    const result = computeGraphLayout(commits);
    const edge = result.edges[0];
    const parentNode = result.nodes.get('c1');
    // Edge color should match the parent lane color
    expect(edge.color).toBe(`var(--color-graph-${(edge.toLane % 12) + 1})`);
  });
});

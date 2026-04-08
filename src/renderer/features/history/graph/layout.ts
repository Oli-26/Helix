import type { CommitNode, GraphLayoutResult, GraphEdge } from '../../../../shared/git-types';

export function computeGraphLayout(commits: CommitNode[]): GraphLayoutResult {
  const nodes = new Map<string, { lane: number; row: number; color: string }>();
  const edges: GraphEdge[] = [];
  let maxLane = 0;

  // Active lanes: each slot holds the commit hash that "owns" that lane, or null if free
  const lanes: (string | null)[] = [];

  // Map from hash to its row index
  const hashToRow = new Map<string, number>();
  commits.forEach((c, i) => hashToRow.set(c.hash, i));

  // Map from hash to expected lane (set by a child commit for its parents)
  const reserved = new Map<string, number>();

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];

    // Find which lane this commit should go in
    let lane: number;
    if (reserved.has(commit.hash)) {
      lane = reserved.get(commit.hash)!;
      reserved.delete(commit.hash);
    } else {
      // New branch head — find first free lane
      lane = lanes.indexOf(null);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(null);
      }
    }

    lanes[lane] = commit.hash;
    const colorIndex = lane % 12;
    nodes.set(commit.hash, { lane, row, color: `var(--color-graph-${colorIndex + 1})` });
    maxLane = Math.max(maxLane, lane);

    // Process parents
    for (let pi = 0; pi < commit.parents.length; pi++) {
      const parentHash = commit.parents[pi];
      const parentRow = hashToRow.get(parentHash);
      if (parentRow === undefined) continue;

      let parentLane: number;

      if (pi === 0) {
        // First parent: continues in the same lane
        parentLane = lane;
        if (!reserved.has(parentHash)) {
          reserved.set(parentHash, lane);
        }
      } else {
        // Merge parent: check if already reserved, otherwise assign a new lane
        if (reserved.has(parentHash)) {
          parentLane = reserved.get(parentHash)!;
        } else {
          parentLane = lanes.indexOf(null);
          if (parentLane === -1) {
            parentLane = lanes.length;
            lanes.push(null);
          }
          reserved.set(parentHash, parentLane);
        }
      }

      maxLane = Math.max(maxLane, parentLane);

      edges.push({
        fromHash: commit.hash,
        toHash: parentHash,
        fromLane: lane,
        toLane: parentLane,
        color: `var(--color-graph-${(parentLane % 12) + 1})`,
      });
    }

    // Free this lane if commit has no parents (root commit)
    if (commit.parents.length === 0) {
      lanes[lane] = null;
    }
  }

  return { nodes, edges, maxLane };
}

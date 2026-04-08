import type { CommitNode, GraphLayoutResult } from '../../../../shared/git-types';

interface PaintOptions {
  commits: CommitNode[];
  layout: GraphLayoutResult;
  rowHeight: number;
  laneWidth: number;
  nodeRadius: number;
  padding: number;
  colors: string[];
  startRow?: number;
  endRow?: number;
}

function resolveColor(cssVar: string, fallbackIndex: number, colors: string[]): string {
  return colors[fallbackIndex % colors.length];
}

export function paintGraph(ctx: CanvasRenderingContext2D, options: PaintOptions) {
  const {
    commits,
    layout,
    rowHeight,
    laneWidth,
    nodeRadius,
    padding,
    colors,
    startRow = 0,
    endRow = commits.length,
  } = options;

  const laneX = (lane: number) => padding + Math.min(lane, 20) * laneWidth + laneWidth / 2;
  const rowY = (row: number) => row * rowHeight + rowHeight / 2;

  // Draw edges (only those touching visible rows)
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  for (const edge of layout.edges) {
    const fromNode = layout.nodes.get(edge.fromHash);
    const toNode = layout.nodes.get(edge.toHash);
    if (!fromNode || !toNode) continue;

    // Skip edges entirely outside visible range
    const minRow = Math.min(fromNode.row, toNode.row);
    const maxRow = Math.max(fromNode.row, toNode.row);
    if (maxRow < startRow || minRow > endRow) continue;

    const x1 = laneX(edge.fromLane);
    const y1 = rowY(fromNode.row);
    const x2 = laneX(edge.toLane);
    const y2 = rowY(toNode.row);

    ctx.beginPath();
    ctx.strokeStyle = resolveColor(edge.color, edge.toLane, colors);

    if (edge.fromLane === edge.toLane) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else {
      const midY = (y1 + y2) / 2;
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
    }

    ctx.stroke();
  }

  // Draw nodes (only visible)
  for (const [hash, node] of layout.nodes) {
    if (node.row < startRow || node.row > endRow) continue;

    const x = laneX(node.lane);
    const y = rowY(node.row);
    const color = resolveColor(node.color, node.lane, colors);

    ctx.beginPath();
    ctx.arc(x, y, nodeRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = color + '33';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const commit = commits[node.row];
    if (commit && commit.parents.length > 1) {
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius - 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0d1117';
      ctx.fill();
    }
  }
}

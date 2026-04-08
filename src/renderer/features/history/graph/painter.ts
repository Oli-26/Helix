import type { CommitNode, GraphLayoutResult } from '../../../../shared/git-types';

interface PaintOptions {
  commits: CommitNode[];
  layout: GraphLayoutResult;
  rowHeight: number;
  laneWidth: number;
  nodeRadius: number;
  padding: number;
  colors: string[];
}

function resolveColor(cssVar: string, fallbackIndex: number, colors: string[]): string {
  // In Canvas we can't use CSS vars directly, so we use the fallback palette
  return colors[fallbackIndex % colors.length];
}

export function paintGraph(ctx: CanvasRenderingContext2D, options: PaintOptions) {
  const { commits, layout, rowHeight, laneWidth, nodeRadius, padding, colors } = options;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const laneX = (lane: number) => padding + lane * laneWidth + laneWidth / 2;
  const rowY = (row: number) => row * rowHeight + rowHeight / 2;

  // Draw edges first (behind nodes)
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  for (const edge of layout.edges) {
    const fromNode = layout.nodes.get(edge.fromHash);
    const toNode = layout.nodes.get(edge.toHash);
    if (!fromNode || !toNode) continue;

    const x1 = laneX(edge.fromLane);
    const y1 = rowY(fromNode.row);
    const x2 = laneX(edge.toLane);
    const y2 = rowY(toNode.row);

    ctx.beginPath();
    ctx.strokeStyle = resolveColor(edge.color, edge.toLane, colors);

    if (edge.fromLane === edge.toLane) {
      // Straight vertical line
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else {
      // Bezier curve for lane changes
      const midY = (y1 + y2) / 2;
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
    }

    ctx.stroke();
  }

  // Draw nodes on top
  for (const [hash, node] of layout.nodes) {
    const x = laneX(node.lane);
    const y = rowY(node.row);
    const color = resolveColor(node.color, node.lane, colors);

    // Outer glow
    ctx.beginPath();
    ctx.arc(x, y, nodeRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = color + '33'; // 20% opacity
    ctx.fill();

    // Node circle
    ctx.beginPath();
    ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // White center dot for merge commits
    const commit = commits[node.row];
    if (commit && commit.parents.length > 1) {
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius - 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0d1117';
      ctx.fill();
    }
  }
}

import { useRef, useEffect, useCallback } from 'react';
import type { CommitNode } from '../../../shared/git-types';
import { computeGraphLayout } from './graph/layout';
import { paintGraph } from './graph/painter';
import { GRAPH_COLORS } from './graph/colors';

const ROW_HEIGHT = 42;
const LANE_WIDTH = 16;
const NODE_RADIUS = 4;
const GRAPH_PADDING = 12;

interface CommitGraphProps {
  commits: CommitNode[];
}

export function CommitGraph({ commits }: CommitGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = computeGraphLayout(commits);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = (layout.maxLane + 2) * LANE_WIDTH + GRAPH_PADDING * 2;
    const height = commits.length * ROW_HEIGHT;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    paintGraph(ctx, {
      commits,
      layout,
      rowHeight: ROW_HEIGHT,
      laneWidth: LANE_WIDTH,
      nodeRadius: NODE_RADIUS,
      padding: GRAPH_PADDING,
      colors: GRAPH_COLORS,
    });
  }, [commits, layout]);

  useEffect(() => {
    draw();
  }, [draw]);

  const width = (layout.maxLane + 2) * LANE_WIDTH + GRAPH_PADDING * 2;

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 overflow-hidden"
      style={{ width: Math.max(width, 60) }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

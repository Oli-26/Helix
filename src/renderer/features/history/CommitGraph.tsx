import { useRef, useEffect, useCallback, useState } from 'react';
import type { CommitNode } from '../../../shared/git-types';
import { computeGraphLayout } from './graph/layout';
import { paintGraph } from './graph/painter';
import { GRAPH_COLORS } from './graph/colors';

const ROW_HEIGHT = 42;
const LANE_WIDTH = 16;
const NODE_RADIUS = 4;
const GRAPH_PADDING = 12;
const MAX_GRAPH_COMMITS = 200; // Only compute graph for first N commits

interface CommitGraphProps {
  commits: CommitNode[];
  scrollTop?: number;
  visibleHeight?: number;
}

export function CommitGraph({ commits, scrollTop = 0, visibleHeight = 800 }: CommitGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only compute graph for a manageable subset
  const graphCommits = commits.slice(0, MAX_GRAPH_COMMITS);
  const layout = computeGraphLayout(graphCommits);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = (Math.min(layout.maxLane, 20) + 2) * LANE_WIDTH + GRAPH_PADDING * 2;

    // Only render visible portion + overscan
    const overscan = 10;
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
    const endRow = Math.min(
      graphCommits.length,
      Math.ceil((scrollTop + visibleHeight) / ROW_HEIGHT) + overscan,
    );
    const visibleRows = endRow - startRow;
    const canvasHeight = visibleRows * ROW_HEIGHT;

    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.marginTop = `${startRow * ROW_HEIGHT}px`;
    ctx.scale(dpr, dpr);
    ctx.translate(0, -startRow * ROW_HEIGHT);

    paintGraph(ctx, {
      commits: graphCommits,
      layout,
      rowHeight: ROW_HEIGHT,
      laneWidth: LANE_WIDTH,
      nodeRadius: NODE_RADIUS,
      padding: GRAPH_PADDING,
      colors: GRAPH_COLORS,
      startRow,
      endRow,
    });
  }, [graphCommits, layout, scrollTop, visibleHeight]);

  useEffect(() => {
    draw();
  }, [draw]);

  const width = (Math.min(layout.maxLane, 20) + 2) * LANE_WIDTH + GRAPH_PADDING * 2;
  const totalHeight = graphCommits.length * ROW_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 overflow-hidden relative"
      style={{ width: Math.max(width, 48), height: totalHeight }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

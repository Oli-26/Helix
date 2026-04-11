import { useRef, useEffect, useState, useCallback } from 'react';
import type { FileConstellationData, ConstellationNode, ConstellationEdge } from '../../../shared/git-types';

// ─── Colors by extension ──────────────────────────────────────────
const EXT_COLORS: Record<string, string> = {
  ts: '#58a6ff', tsx: '#58a6ff', js: '#f0db4f', jsx: '#f0db4f',
  py: '#4584b6', rs: '#ff6e4a', go: '#00add8', java: '#f89820',
  rb: '#cc342d', css: '#8b5cf6', scss: '#c6538c', html: '#f06529',
  json: '#5fb3a1', md: '#519aba', yml: '#cb171e', yaml: '#cb171e',
  sh: '#89e051', sql: '#e38c00', c: '#a8b9cc', cpp: '#f34b7d',
  h: '#a8b9cc', swift: '#f05138', kt: '#a97bff', vue: '#42b883',
  svelte: '#ff3e00', toml: '#9c4221', lock: '#4a5568', svg: '#ffb13b',
};

function getColor(ext: string): string {
  return EXT_COLORS[ext] || '#6b7280';
}

// ─── Simulation node (mutable positions) ──────────────────────────
interface SimNode extends ConstellationNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

// ─── Legend ────────────────────────────────────────────────────────
function Legend({ nodes }: { nodes: SimNode[] }) {
  const extCounts = new Map<string, number>();
  for (const n of nodes) {
    extCounts.set(n.ext, (extCounts.get(n.ext) || 0) + 1);
  }
  const sorted = [...extCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  return (
    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-3 text-xs space-y-1.5 pointer-events-none">
      <div className="text-white/70 font-medium mb-2">File types</div>
      {sorted.map(([ext, count]) => (
        <div key={ext} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(ext) }} />
          <span className="text-white/80 font-mono">.{ext}</span>
          <span className="text-white/40 ml-auto">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Info panel ───────────────────────────────────────────────────
function InfoPanel({ hovered, edges, nodes }: {
  hovered: SimNode;
  edges: ConstellationEdge[];
  nodes: SimNode[];
}) {
  const connected = edges
    .filter((e) => e.source === hovered.id || e.target === hovered.id)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map((e) => ({
      node: nodes[e.source === hovered.id ? e.target : e.source],
      weight: e.weight,
    }));

  return (
    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-xs max-w-[300px] pointer-events-none">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(hovered.ext) }} />
        <span className="text-white font-mono text-sm truncate">{hovered.path}</span>
      </div>
      <div className="text-white/50 mb-3">
        Changed in {hovered.changeCount} commits
      </div>
      {connected.length > 0 && (
        <>
          <div className="text-white/60 font-medium mb-1.5">Often changed with:</div>
          <div className="space-y-1">
            {connected.map(({ node, weight }) => (
              <div key={node.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(node.ext) }} />
                <span className="text-white/70 font-mono truncate flex-1">{node.path}</span>
                <span className="text-white/30 flex-shrink-0">{weight}x</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Controls ─────────────────────────────────────────────────────
function Controls() {
  return (
    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 pointer-events-none space-y-0.5">
      <div><kbd className="text-white/70">Scroll</kbd> Zoom</div>
      <div><kbd className="text-white/70">Drag</kbd> Pan</div>
      <div><kbd className="text-white/70">Hover</kbd> Inspect</div>
    </div>
  );
}

// ─── Main canvas ──────────────────────────────────────────────────
export function ConstellationCanvas({ data }: { data: FileConstellationData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({
    dragging: false, lastX: 0, lastY: 0,
  });

  // Initialize simulation nodes with positions
  useEffect(() => {
    const maxChange = Math.max(...data.nodes.map((n) => n.changeCount), 1);
    const spread = Math.sqrt(data.nodes.length) * 40;

    nodesRef.current = data.nodes.map((n) => ({
      ...n,
      x: (Math.random() - 0.5) * spread,
      y: (Math.random() - 0.5) * spread,
      vx: 0,
      vy: 0,
      radius: 2 + Math.sqrt(n.changeCount / maxChange) * 8,
    }));
  }, [data.nodes]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Build edge lookup for fast access
  const edgesByNode = useRef(new Map<number, ConstellationEdge[]>());
  useEffect(() => {
    const map = new Map<number, ConstellationEdge[]>();
    for (const e of data.edges) {
      if (!map.has(e.source)) map.set(e.source, []);
      if (!map.has(e.target)) map.set(e.target, []);
      map.get(e.source)!.push(e);
      map.get(e.target)!.push(e);
    }
    edgesByNode.current = map;
  }, [data.edges]);

  // Force simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let tick = 0;
    const maxTicks = 400;
    const maxEdgeWeight = Math.max(...data.edges.map((e) => e.weight), 1);

    // Background stars (static decoration)
    const bgStars = Array.from({ length: 200 }, () => ({
      x: (Math.random() - 0.5) * 4000,
      y: (Math.random() - 0.5) * 4000,
      brightness: Math.random() * 0.3 + 0.05,
      size: Math.random() * 1.2 + 0.3,
    }));

    const frame = () => {
      const { width, height } = dimensions;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      const nodes = nodesRef.current;
      const cam = cameraRef.current;

      // ── Force simulation (gradually cools) ──
      if (tick < maxTicks) {
        const alpha = 1 - tick / maxTicks;
        const dt = 0.3 * alpha;

        // Repulsion (Barnes-Hut-like: just do pairwise for <= 300 nodes)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            const force = 800 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }

        // Attraction along edges
        for (const edge of data.edges) {
          const a = nodes[edge.source];
          const b = nodes[edge.target];
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const strength = Math.min(edge.weight / maxEdgeWeight, 1) * 0.15;
          const force = (dist - 50) * strength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }

        // Center gravity
        for (const node of nodes) {
          node.vx -= node.x * 0.001;
          node.vy -= node.y * 0.001;
        }

        // Integrate
        for (const node of nodes) {
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx * dt;
          node.y += node.vy * dt;
        }

        tick++;
      }

      // ── Render ──

      // Background
      ctx.fillStyle = '#05080f';
      ctx.fillRect(0, 0, width, height);

      // Transform for camera
      ctx.save();
      ctx.translate(width / 2 + cam.x, height / 2 + cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      // Background decoration stars
      for (const star of bgStars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      // Edges
      const hovId = hoveredNode?.id;
      for (const edge of data.edges) {
        const a = nodes[edge.source];
        const b = nodes[edge.target];
        if (!a || !b) continue;

        const isHighlighted = hovId === edge.source || hovId === edge.target;
        const baseAlpha = (edge.weight / maxEdgeWeight) * 0.25 + 0.03;
        const alpha = isHighlighted ? 0.6 : (hovId != null ? baseAlpha * 0.15 : baseAlpha);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = isHighlighted
          ? `rgba(255, 255, 255, ${alpha})`
          : `rgba(100, 140, 200, ${alpha})`;
        ctx.lineWidth = isHighlighted ? 1.2 : 0.5;
        ctx.stroke();
      }

      // Nodes (stars)
      for (const node of nodes) {
        const isHovered = hovId === node.id;
        const isConnected = hovId != null && data.edges.some(
          (e) => (e.source === hovId && e.target === node.id) || (e.target === hovId && e.source === node.id),
        );
        const dimmed = hovId != null && !isHovered && !isConnected;

        const color = getColor(node.ext);
        const r = isHovered ? node.radius * 1.6 : node.radius;

        // Glow
        if (!dimmed) {
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3);
          gradient.addColorStop(0, color + (isHovered ? '40' : '18'));
          gradient.addColorStop(1, color + '00');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = dimmed ? color + '30' : color;
        ctx.fill();

        // Bright center
        if (!dimmed) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fill();
        }

        // Label for hovered / large nodes
        if (isHovered) {
          const label = node.path.split('/').pop() || node.path;
          ctx.font = `${12 / cam.zoom}px Inter, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.textAlign = 'center';
          ctx.fillText(label, node.x, node.y - r - 6 / cam.zoom);
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [dimensions, data.edges, data.nodes, hoveredNode]);

  // ── Mouse interaction ──

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cam = cameraRef.current;
    const { width, height } = dimensions;
    return {
      x: (sx - width / 2 - cam.x) / cam.zoom,
      y: (sy - height / 2 - cam.y) / cam.zoom,
    };
  }, [dimensions]);

  const findNodeAt = useCallback((sx: number, sy: number) => {
    const { x, y } = screenToWorld(sx, sy);
    const nodes = nodesRef.current;
    let closest: SimNode | null = null;
    let closestDist = Infinity;
    for (const node of nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = node.radius + 4 / cameraRef.current.zoom;
      if (dist < hitRadius && dist < closestDist) {
        closest = node;
        closestDist = dist;
      }
    }
    return closest;
  }, [screenToWorld]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current.dragging) {
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      return;
    }

    const node = findNodeAt(sx, sy);
    setHoveredNode(node);
  }, [findNodeAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const cam = cameraRef.current;
    const newZoom = Math.max(0.1, Math.min(10, cam.zoom * factor));

    // Zoom towards mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mx = e.clientX - rect.left - dimensions.width / 2 - cam.x;
      const my = e.clientY - rect.top - dimensions.height / 2 - cam.y;
      cam.x -= mx * (factor - 1);
      cam.y -= my * (factor - 1);
    }

    cam.zoom = newZoom;
  }, [dimensions]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#05080f]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: dragRef.current.dragging ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredNode(null); }}
        onWheel={handleWheel}
      />

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div className="text-white/80 text-sm font-medium">File Constellation</div>
        <div className="text-white/30 text-xs mt-0.5">
          {data.nodes.length} files &middot; {data.edges.length} connections
        </div>
      </div>

      <Controls />
      <Legend nodes={nodesRef.current} />
      {hoveredNode && (
        <InfoPanel hovered={hoveredNode} edges={data.edges} nodes={nodesRef.current} />
      )}
    </div>
  );
}

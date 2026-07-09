"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { api, type GraphEdge, type GraphNode } from "@/lib/api";
import { Loader, Network, RefreshCw } from "lucide-react";

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const WIDTH = 900;
const HEIGHT = 600;

const EDGE_COLOR: Record<GraphEdge["type"], string> = {
  covers: "rgba(148,163,184,0.35)",
  similar: "rgba(56,189,248,0.55)",
  prerequisite: "rgba(167,139,250,0.65)",
  related: "rgba(52,211,153,0.55)",
};

function useForceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (nodes.length === 0) {
      queueMicrotask(() => setPositions(new Map()));
      return;
    }

    const sim: SimNode[] = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      return { ...n, x: WIDTH / 2 + Math.cos(angle) * 200, y: HEIGHT / 2 + Math.sin(angle) * 200, vx: 0, vy: 0 };
    });
    const byId = new Map(sim.map((n) => [n.id, n]));

    let frame = 0;
    let raf = 0;

    function tick() {
      // Repulsion between every pair of nodes.
      for (let i = 0; i < sim.length; i++) {
        for (let j = i + 1; j < sim.length; j++) {
          const a = sim[i];
          const b = sim[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const distSq = dx * dx + dy * dy || 0.01;
          const dist = Math.sqrt(distSq);
          const force = 2200 / distSq;
          dx /= dist;
          dy /= dist;
          a.vx += dx * force;
          a.vy += dy * force;
          b.vx -= dx * force;
          b.vy -= dy * force;
        }
      }

      // Spring attraction along edges.
      for (const e of edges) {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (dist - 140) * 0.02;
        const ux = dx / dist;
        const uy = dy / dist;
        a.vx += ux * force;
        a.vy += uy * force;
        b.vx -= ux * force;
        b.vy -= uy * force;
      }

      // Centering pull + damping + integrate.
      for (const n of sim) {
        n.vx += (WIDTH / 2 - n.x) * 0.001;
        n.vy += (HEIGHT / 2 - n.y) * 0.001;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x = Math.min(WIDTH - 40, Math.max(40, n.x + n.vx));
        n.y = Math.min(HEIGHT - 40, Math.max(40, n.y + n.vy));
      }

      frame += 1;
      if (frame % 2 === 0) {
        setPositions(new Map(sim.map((n) => [n.id, { x: n.x, y: n.y }])));
      }
      if (frame < 240) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges]);

  return positions;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-cyan-200 [animation:aisch-spin_0.7s_linear_infinite]" />
        <p className="mt-4 text-sm font-black text-white/52">Opening knowledge graph...</p>
      </div>
    </div>
  );
}

export default function KnowledgeGraphPage() {
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [graphLoading, setGraphLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const fetchedOnce = useRef(false);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      setGraphLoading(true);
      try {
        const graph = await api.getKnowledgeGraph(accessToken);
        setNodes(graph.nodes);
        setEdges(graph.edges);
      } finally {
        setGraphLoading(false);
        fetchedOnce.current = true;
      }
    })();
  }, [accessToken]);

  const positions = useForceLayout(nodes, edges);

  async function handleRebuild() {
    if (!accessToken) return;
    setRebuilding(true);
    try {
      await api.rebuildKnowledgeGraph(accessToken);
    } finally {
      setRebuilding(false);
    }
  }

  if (loading || !user) return <LoadingScreen />;

  const rebuildBtn = (
    <button
      onClick={handleRebuild}
      disabled={rebuilding}
      className="aisch-button-primary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black disabled:opacity-50"
    >
      {rebuilding ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
      Rebuild graph
    </button>
  );

  return (
    <AppShell
      user={user}
      title="Knowledge graph"
      subtitle="How your documents and topics connect"
      actions={rebuildBtn}
      isDark={isDark}
      onToggleDark={toggleDark}
      onSignOut={signOut}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
          {graphLoading ? (
            <div className="flex h-[600px] items-center justify-center">
              <Loader size={24} className="animate-spin text-white/40" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex h-[600px] flex-col items-center justify-center gap-4 text-center">
              <Network size={40} className="text-white/25" />
              <p className="max-w-sm text-sm font-semibold text-white/45">
                Upload at least two documents and wait for them to finish processing — topics and
                connections appear here automatically once they&apos;re ready.
              </p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Knowledge graph">
              {edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={EDGE_COLOR[e.type]}
                    strokeWidth={e.type === "similar" ? 2.5 : 1.25}
                    strokeDasharray={e.type === "prerequisite" || e.type === "related" ? "4 4" : undefined}
                  />
                );
              })}
              {nodes.map((n) => {
                const pos = positions.get(n.id);
                if (!pos) return null;
                const isDoc = n.type === "document";
                const radius = isDoc ? 22 : 12;
                return (
                  <g key={n.id} transform={`translate(${pos.x}, ${pos.y})`} onClick={() => setSelected(n)} className="cursor-pointer">
                    <circle
                      r={radius}
                      className={isDoc ? "fill-cyan-300/80" : "fill-violet-300/70"}
                      stroke={selected?.id === n.id ? "#fff" : "rgba(255,255,255,0.25)"}
                      strokeWidth={selected?.id === n.id ? 2 : 1}
                    />
                    <text y={radius + 14} textAnchor="middle" className={`font-black ${isDoc ? "fill-white text-[12px]" : "fill-white/70 text-[10px]"}`}>
                      {n.label.length > 22 ? `${n.label.slice(0, 20)}…` : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </section>

        <aside className="space-y-4">
          <section className="aisch-surface-soft rounded-[32px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Legend</p>
            <div className="mt-4 space-y-2 text-xs font-bold text-white/60">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-cyan-300/80" /> Document
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-violet-300/70" /> Topic
              </div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-slate-400/50" /> Covers
              </div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-cyan-400/60" /> Similar documents
              </div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-violet-400/70" /> Prerequisite / related
              </div>
            </div>
          </section>

          {selected && (
            <section className="aisch-surface-soft rounded-[32px] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">
                {selected.type === "document" ? "Document" : "Topic"}
              </p>
              <h3 className="mt-2 text-lg font-black text-white">{selected.label}</h3>
              {selected.subject && <p className="mt-1 text-xs font-bold text-white/40">{selected.subject}</p>}
              <div className="mt-4 space-y-1 text-xs font-semibold text-white/50">
                {Object.entries(selected.metadata).map(([k, v]) =>
                  v === null || v === undefined ? null : (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="capitalize text-white/35">{k.replace(/_/g, " ")}</span>
                      <span className="text-white/70">{String(v)}</span>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { api } from "@/lib/api";
import type { NetworkData, NetworkLink, NetworkNode } from "@/lib/types";
import { formatNumber, formatRating } from "@/lib/format";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { Flag } from "@/components/ui/Flag";
import { Pill } from "@/components/ui/primitives";

export default function ArtistNeuralGraph() {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters & State
  const [threshold, setThreshold] = useState(0.40);
  const [minAlbums, setMinAlbums] = useState<number>(1);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [hoverNode, setHoverNode] = useState<NetworkNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(540, Math.min(680, window.innerHeight * 0.7)),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fetch full network data from API
  useEffect(() => {
    let alive = true;
    api.network({ min_albums: 1, top_k: 5, threshold: 0.35 })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Neighbor mappings for fast O(1) spotlight lookups
  const { nodeNeighborsMap, linkMap } = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    const links = new Map<string, NetworkLink>();

    if (!data) return { nodeNeighborsMap: neighbors, linkMap: links };

    for (const link of data.links) {
      const s = typeof link.source === "object" ? (link.source as NetworkNode).id : link.source;
      const t = typeof link.target === "object" ? (link.target as NetworkNode).id : link.target;

      if (!neighbors.has(s)) neighbors.set(s, new Set());
      if (!neighbors.has(t)) neighbors.set(t, new Set());
      neighbors.get(s)!.add(t);
      neighbors.get(t)!.add(s);

      links.set(`${s}--${t}`, link);
      links.set(`${t}--${s}`, link);
    }

    return { nodeNeighborsMap: neighbors, linkMap: links };
  }, [data]);

  // Filtered graph data according to UI controls
  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    // 1. Filter nodes by minimum albums
    let activeNodes = data.nodes.filter((n) => n.album_count >= minAlbums);
    const activeNodeIds = new Set(activeNodes.map((n) => n.id));

    // 2. Filter links by threshold & active nodes
    let activeLinks = data.links.filter((l) => {
      const s = typeof l.source === "object" ? (l.source as NetworkNode).id : l.source;
      const t = typeof l.target === "object" ? (l.target as NetworkNode).id : l.target;
      return l.weight >= threshold && activeNodeIds.has(s) && activeNodeIds.has(t);
    });

    // 3. Local Graph mode (Obsidian feature): focus on selected node + 1st & 2nd degree neighbors
    if (isLocalMode && selectedNode) {
      const focalId = selectedNode.id;
      const localNodeIds = new Set<string>([focalId]);

      // 1st degree
      const direct = nodeNeighborsMap.get(focalId) ?? new Set();
      for (const d of direct) {
        if (activeNodeIds.has(d)) localNodeIds.add(d);
      }

      // 2nd degree
      for (const d of direct) {
        const secondary = nodeNeighborsMap.get(d) ?? new Set();
        for (const s of secondary) {
          if (activeNodeIds.has(s)) localNodeIds.add(s);
        }
      }

      activeNodes = activeNodes.filter((n) => localNodeIds.has(n.id));
      activeLinks = activeLinks.filter((l) => {
        const s = typeof l.source === "object" ? (l.source as NetworkNode).id : l.source;
        const t = typeof l.target === "object" ? (l.target as NetworkNode).id : l.target;
        return localNodeIds.has(s) && localNodeIds.has(t);
      });
    }

    return {
      nodes: activeNodes.map((n) => ({ ...n })),
      links: activeLinks.map((l) => ({ ...l })),
    };
  }, [data, minAlbums, threshold, isLocalMode, selectedNode, nodeNeighborsMap]);

  // Tune D3 physics for authentic Obsidian elastic feel
  useEffect(() => {
    if (fgRef.current) {
      const charge = fgRef.current.d3Force("charge");
      if (charge) charge.strength(-100);

      const linkForce = fgRef.current.d3Force("link");
      if (linkForce) {
        linkForce.distance((link: any) => Math.max(30, 200 * (1 - (link.weight || 0.4))));
      }
    }
  }, [graphData]);

  // Spotlight active neighbors
  const spotlightNodeIds = useMemo(() => {
    const focus = hoverNode || (isLocalMode ? selectedNode : null);
    if (!focus) return null;

    const set = new Set<string>([focus.id]);
    const nbrs = nodeNeighborsMap.get(focus.id);
    if (nbrs) {
      for (const id of nbrs) set.add(id);
    }
    return set;
  }, [hoverNode, isLocalMode, selectedNode, nodeNeighborsMap]);

  // Search matches
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !data) return [];
    const q = searchQuery.toLowerCase();
    return data.nodes
      .filter((n) => n.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, data]);

  // Focus camera on an artist
  const focusOnArtist = useCallback((node: NetworkNode) => {
    setSelectedNode(node);
    setSearchQuery("");
    setIsSearchOpen(false);
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.5, 800);
    }
  }, []);

  // Connected peers for selected node in drawer
  const connectedPeers = useMemo(() => {
    if (!selectedNode || !data) return [];
    const direct = nodeNeighborsMap.get(selectedNode.id);
    if (!direct) return [];

    const peers: { node: NetworkNode; link: NetworkLink }[] = [];
    for (const neighborId of direct) {
      const n = data.nodes.find((item) => item.id === neighborId);
      const l = linkMap.get(`${selectedNode.id}--${neighborId}`);
      if (n && l) {
        peers.push({ node: n, link: l });
      }
    }
    return peers.sort((a, b) => b.link.weight - a.link.weight);
  }, [selectedNode, data, nodeNeighborsMap, linkMap]);

  // Canvas Node rendering: Obsidian style circles, glow, and semantic LOD text
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isSpotlighted = spotlightNodeIds === null || spotlightNodeIds.has(node.id);
      const isHovered = hoverNode && hoverNode.id === node.id;
      const isSelected = selectedNode && selectedNode.id === node.id;

      const baseR = Math.max(3.5, Math.min(13, 3 + Math.sqrt(node.scrobbles || 1) * 0.35 + node.album_count * 1.1));
      const r = isHovered || isSelected ? baseR * 1.25 : baseR;

      ctx.save();
      ctx.globalAlpha = isSpotlighted ? 1.0 : 0.12;

      // Glow effect for spotlighted / selected node
      if (isHovered || isSelected) {
        ctx.shadowColor = node.rating_color;
        ctx.shadowBlur = 14;
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.rating_color;
      ctx.fill();

      // Border highlight
      ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
      ctx.strokeStyle = isSelected ? "#ffffff" : isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)";
      ctx.stroke();

      // Semantic LOD Labels (Obsidian style)
      // High zoom (scale > 1.3) shows all labels. Low zoom shows major artists or hovered/neighbors.
      const showLabel =
        globalScale > 1.3 ||
        node.album_count >= 3 ||
        (isSpotlighted && (hoverNode || selectedNode)) ||
        node.scrobbles > 150;

      if (showLabel) {
        const fontSize = Math.max(10 / globalScale, 3);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Background shadow for legibility
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = isSpotlighted ? (isHovered || isSelected ? "#ffffff" : "rgba(240, 240, 245, 0.9)") : "rgba(255, 255, 255, 0.25)";
        ctx.fillText(node.name, node.x, node.y + r + 2.5);
      }

      ctx.restore();
    },
    [spotlightNodeIds, hoverNode, selectedNode],
  );

  // Link canvas styling
  const getLinkColor = useCallback(
    (link: any) => {
      const s = typeof link.source === "object" ? link.source.id : link.source;
      const t = typeof link.target === "object" ? link.target.id : link.target;

      const activeFocus = hoverNode || (isLocalMode ? selectedNode : null);

      if (activeFocus) {
        const isConnected = s === activeFocus.id || t === activeFocus.id;
        if (isConnected) return "rgba(196, 181, 253, 0.85)";
        return "rgba(255, 255, 255, 0.025)";
      }

      const alpha = Math.min(0.65, 0.12 + (link.weight || 0.4) * 0.55);
      return `rgba(169, 150, 255, ${alpha})`;
    },
    [hoverNode, isLocalMode, selectedNode],
  );

  const getLinkWidth = useCallback(
    (link: any) => {
      const s = typeof link.source === "object" ? link.source.id : link.source;
      const t = typeof link.target === "object" ? link.target.id : link.target;
      const activeFocus = hoverNode || (isLocalMode ? selectedNode : null);

      if (activeFocus && (s === activeFocus.id || t === activeFocus.id)) {
        return 2.5;
      }
      return Math.max(0.6, (link.weight || 0.4) * 2.0);
    },
    [hoverNode, isLocalMode, selectedNode],
  );

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-ink-950/70 border border-white/[0.06]">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 py-3 backdrop-blur sm:px-6">
        {/* Left: Search input */}
        <div className="relative w-full sm:w-64">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white transition-colors focus-within:border-accent-soft focus-within:bg-white/[0.07]">
            <span className="text-zinc-500">🔍</span>
            <input
              type="text"
              placeholder="Find artist in graph…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-transparent font-sans placeholder-zinc-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-zinc-400 hover:text-white"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="glass absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-auto rounded-xl p-1 shadow-2xl">
              {searchResults.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => focusOnArtist(artist)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06]"
                >
                  <span className="flex items-center gap-2 truncate text-zinc-200">
                    <Flag code={artist.country_code} name={artist.country_name} />
                    <span className="truncate">{artist.name}</span>
                  </span>
                  <span
                    className="data shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: artist.rating_color, color: artist.rating_text_color }}
                  >
                    {formatRating(artist.avg_rating)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center/Right: Sliders & Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Synapse Strength Slider */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
            <span className="text-zinc-400 text-[11px]">Synapse threshold:</span>
            <input
              type="range"
              min="0.35"
              max="0.80"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="h-1.5 w-20 sm:w-28 cursor-pointer accent-accent-soft"
            />
            <span className="data font-mono text-[11px] text-accent-glow font-bold">
              {Math.round(threshold * 100)}%
            </span>
          </div>

          {/* Min Albums Toggle */}
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
            {[1, 2, 3].map((val) => (
              <button
                key={val}
                onClick={() => setMinAlbums(val)}
                className={clsx(
                  "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all",
                  minAlbums === val
                    ? "bg-accent/30 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                {val === 1 ? "All" : `${val}+ albums`}
              </button>
            ))}
          </div>

          {/* Local Graph Mode (Obsidian feature) */}
          <button
            onClick={() => setIsLocalMode(!isLocalMode)}
            className={clsx(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-all",
              isLocalMode
                ? "border-accent bg-accent/25 text-accent-glow shadow-[0_0_15px_-4px_rgba(124,92,255,0.6)]"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
            )}
            title="Toggle Local Graph view (Obsidian style)"
          >
            <span className={clsx("size-1.5 rounded-full", isLocalMode ? "bg-accent-soft animate-pulse" : "bg-zinc-500")} />
            Local Graph
          </button>
        </div>
      </div>

      {/* Main Canvas Area + Side Drawer */}
      <div ref={containerRef} className="relative h-[560px] w-full bg-ink-950">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink-950/80 backdrop-blur">
            <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs text-zinc-400">Synthesizing 16D neural embedding space…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-zinc-500">
            Could not compute artist neural network.
          </div>
        )}

        {/* Force Graph 2D */}
        {!loading && !error && (
          <ForceGraph2D
            ref={fgRef as any}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#05050a"
            nodeRelSize={4}
            nodeCanvasObject={drawNode}
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.003}
            linkDirectionalParticleWidth={1.8}
            linkDirectionalParticleColor={() => "#c4b5fd"}
            onNodeHover={(node) => setHoverNode(node as NetworkNode | null)}
            onNodeClick={(node) => focusOnArtist(node as NetworkNode)}
            onBackgroundClick={() => setSelectedNode(null)}
            cooldownTicks={120}
          />
        )}

        {/* Legend pill bottom-left */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-ink-950/70 px-3 py-2 text-[11px] text-zinc-400 backdrop-blur border border-white/[0.06]">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent-soft" />
            Node size = scrobbles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#27a9a2" }} />
            Node color = rating
          </span>
          <span className="data text-zinc-500">
            {graphData.nodes.length} nodes · {graphData.links.length} synapses
          </span>
        </div>

        {/* Side Detail Card (Obsidian Inspector) */}
        {selectedNode && (
          <aside className="glass absolute right-3 top-3 bottom-3 z-30 w-80 sm:w-96 overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow mb-1">Neural Profile</p>
                <h3 className="truncate text-xl font-bold text-white">{selectedNode.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                  <Flag code={selectedNode.country_code} name={selectedNode.country_name} showName />
                </p>
              </div>

              <div className="flex items-center gap-2">
                <RatingBadge
                  rating={selectedNode.avg_rating}
                  color={selectedNode.rating_color}
                  textColor={selectedNode.rating_text_color}
                  size="sm"
                />
                <button
                  onClick={() => setSelectedNode(null)}
                  className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-2.5">
                <p className="text-zinc-500">Albums in Library</p>
                <p className="data mt-1 text-base font-semibold text-white">{selectedNode.album_count}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-2.5">
                <p className="text-zinc-500">Total Plays</p>
                <p className="data mt-1 text-base font-semibold text-accent-soft">
                  {formatNumber(selectedNode.scrobbles)}
                </p>
              </div>
            </div>

            {/* Genres & Tags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedNode.genres.map((g) => (
                <Pill key={g} className="text-[10px] uppercase font-mono tracking-wider">
                  {g}
                </Pill>
              ))}
              {selectedNode.tags.slice(0, 3).map((t) => (
                <Pill key={t} className="text-[10px] text-zinc-400">
                  #{t}
                </Pill>
              ))}
            </div>

            {/* Neural Connections Section */}
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="eyebrow mb-2">Neural Synapses ({connectedPeers.length})</p>
              {connectedPeers.length === 0 ? (
                <p className="text-xs text-zinc-500">No synapses exceed current threshold.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {connectedPeers.map(({ node: peer, link }) => (
                    <button
                      key={peer.id}
                      onClick={() => focusOnArtist(peer)}
                      className="group flex w-full flex-col gap-1 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2 text-left transition-all hover:border-white/15 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate text-xs font-medium text-zinc-200 group-hover:text-white">
                          <Flag code={peer.country_code} name={peer.country_name} />
                          <span className="truncate">{peer.name}</span>
                        </span>
                        <span className="data font-mono text-[11px] font-bold text-accent-glow">
                          {Math.round(link.weight * 100)}%
                        </span>
                      </div>
                      {link.shared_traits && link.shared_traits.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {link.shared_traits.slice(0, 3).map((trait) => (
                            <span
                              key={trait}
                              className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-zinc-400"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Albums in Library */}
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="eyebrow mb-2">Albums ({selectedNode.albums.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedNode.albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/[0.05]"
                  >
                    <span className="truncate text-zinc-300 hover:text-white">
                      {album.album} {album.year && <span className="text-zinc-500">({album.year})</span>}
                    </span>
                    <RatingBadge rating={album.rating} color={album.rating_color} size="xs" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}


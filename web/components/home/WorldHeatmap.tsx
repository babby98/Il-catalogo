"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { m } from "framer-motion";
import { api } from "@/lib/api";
import type { CountryCount } from "@/lib/types";
import { Flag } from "@/components/ui/Flag";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const ANTARCTICA = "010";

/* Sequential scale on the primary theme hue: deep indigo -> accent -> lilac */
const STOPS = ["#221d4a", "#5b3fd9", "#7c5cff", "#c4b5fd"];
const EMPTY = "#14141f";

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
function lerpColor(t: number) {
  const x = Math.min(Math.max(t, 0), 1) * (STOPS.length - 1);
  const i = Math.min(Math.floor(x), STOPS.length - 2);
  const f = x - i;
  const a = hexToRgb(STOPS[i]!);
  const b = hexToRgb(STOPS[i + 1]!);
  const c = a.map((v, k) => Math.round(v + (b[k]! - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

interface Hover {
  name: string;
  code?: string;
  count: number;
}

export default function WorldHeatmap() {
  const [data, setData] = useState<CountryCount[] | null>(null);
  const [pending, setPending] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Fetch, and keep polling while MusicBrainz nationalities are still resolving.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await api.countries();
        if (!alive) return;
        setData(res.countries);
        setPending(res.pending);
        if (res.pending > 0) timer = setTimeout(load, 8000);
      } catch {
        if (alive) setData((d) => d ?? []);
      }
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const byNumeric = useMemo(() => new Map((data ?? []).map((c) => [c.numeric, c])), [data]);
  const max = useMemo(() => Math.max(1, ...(data ?? []).map((c) => c.count)), [data]);
  const total = useMemo(() => (data ?? []).reduce((s, c) => s + c.count, 0), [data]);

  // Tooltip follows cursor via direct style mutation -> no React re-render per mousemove.
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = tipRef.current;
    if (el) el.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY + 14}px, 0)`;
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="relative" onMouseMove={onMove}>
        <MapCanvas byNumeric={byNumeric} max={max} onHover={setHover} />

        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-3 rounded-xl bg-ink-950/60 px-3 py-2 backdrop-blur">
          <span className="data text-[10px] text-zinc-500">1</span>
          <span
            className="h-1.5 w-28 rounded-full"
            style={{ background: `linear-gradient(90deg, ${STOPS.join(",")})` }}
          />
          <span className="data text-[10px] text-zinc-500">{max}</span>
          <span className="text-[10px] text-zinc-500">bands</span>
        </div>

        {pending > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-2 rounded-full bg-ink-950/70 px-3 py-1.5 text-[11px] text-zinc-400 backdrop-blur">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-accent-soft" />
            Resolving {pending} artists…
          </div>
        )}
      </div>

      <aside className="flex flex-col">
        <p className="eyebrow mb-3">Top nations</p>
        <ol className="space-y-1.5">
          {(data ?? []).slice(0, 10).map((c, i) => (
            <m.li
              key={c.code}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-2.5 py-1.5 text-sm"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-lg bg-accent/15 transition-colors group-hover:bg-accent/25"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
              <span className="data relative w-5 text-[11px] text-zinc-500">{i + 1}</span>
              <Flag code={c.code} name={c.name} className="relative" />
              <span className="relative flex-1 truncate text-zinc-200">{c.name}</span>
              <span className="data relative text-xs text-zinc-400">{c.count}</span>
            </m.li>
          ))}
        </ol>
        {data && (
          <p className="mt-auto pt-4 text-xs text-zinc-500">
            <span className="data text-zinc-300">{total}</span> bands across{" "}
            <span className="data text-zinc-300">{data.length}</span> countries
          </p>
        )}
      </aside>

      {/* Tooltip */}
      <div
        ref={tipRef}
        className="pointer-events-none fixed left-0 top-0 z-50 will-change-transform"
        style={{ opacity: hover ? 1 : 0, transition: "opacity 120ms" }}
      >
        {hover && (
          <div className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
            {hover.code && <Flag code={hover.code} />}
            <span className="font-medium text-white">{hover.name}</span>
            <span className="data text-accent-soft">{hover.count}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* Memoised so hover state changes never re-render ~180 SVG paths. */
const MapCanvas = memo(function MapCanvas({
  byNumeric,
  max,
  onHover,
}: {
  byNumeric: Map<string, CountryCount>;
  max: number;
  onHover: (h: Hover | null) => void;
}) {
  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={{ scale: 175 }}
      width={900}
      height={440}
      className="h-auto w-full"
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies
            .filter((g) => g.id !== ANTARCTICA)
            .map((geo) => {
              const c = byNumeric.get(String(geo.id));
              const t = c ? Math.log1p(c.count) / Math.log1p(max) : 0;
              const fill = c ? lerpColor(t) : EMPTY;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() =>
                    onHover({ name: c?.name ?? geo.properties.name, code: c?.code, count: c?.count ?? 0 })
                  }
                  onMouseLeave={() => onHover(null)}
                  style={{
                    default: { fill, stroke: "#05050a", strokeWidth: 0.5, outline: "none", transition: "fill 300ms" },
                    hover: { fill: c ? "#f0abfc" : "#22222f", stroke: "#05050a", strokeWidth: 0.5, outline: "none", cursor: "pointer" },
                    pressed: { fill, outline: "none" },
                  }}
                />
              );
            })
        }
      </Geographies>
    </ComposableMap>
  );
});


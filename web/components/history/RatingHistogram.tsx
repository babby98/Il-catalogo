"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Album, Palette } from "@/lib/types";

interface Bin {
  key: string;
  from: number;
  count: number;
  bg: string;
}

/** Histogram ordered by rating (0.5 buckets); each bar uses the ColorScheme.py colour of its bucket. */
export default function RatingHistogram({ albums, palette }: { albums: Album[]; palette: Palette }) {
  const bins = useMemo<Bin[]>(() => {
    if (!albums.length) return [];
    const counts = new Map<number, number>();
    for (const a of albums) {
      const b = Math.floor(a.rating * 2) / 2;
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    const min = Math.min(...counts.keys());
    const max = Math.max(...counts.keys());
    const out: Bin[] = [];
    for (let b = min; b <= max; b += 0.5) {
      const key = b.toFixed(1);
      // For bucket 9.5 in the histogram, override with a harmonious indigo/blue
      // between 9.0 (#24597b) and 10.0 (#152b56) as requested.
      const bg = key === "9.5" ? "#1e4472" : (palette[key]?.bg ?? "#7c5cff");
      out.push({ key, from: b, count: counts.get(b) ?? 0, bg });
    }
    return out;
  }, [albums, palette]);

  if (!bins.length) return <Empty />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={bins} margin={{ top: 16, right: 4, bottom: 0, left: -24 }} barCategoryGap="18%">
        <XAxis
          dataKey="key"
          tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#52525b", fontSize: 10, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ active, payload }) => {
            const b = payload?.[0]?.payload as Bin | undefined;
            if (!active || !b) return null;
            return (
              <div className="glass rounded-xl px-3 py-2 text-xs">
                <p className="data text-zinc-400">
                  {b.from.toFixed(1)} – {(b.from + 0.49).toFixed(2)}
                </p>
                <p className="mt-0.5 font-medium text-white">
                  <span className="data">{b.count}</span> albums
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[6, 6, 2, 2]} animationDuration={700} animationEasing="ease-out">
          {bins.map((b) => (
            <Cell key={b.key} fill={b.bg} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <div className="grid h-[220px] place-items-center text-xs text-zinc-600">No data</div>;
}


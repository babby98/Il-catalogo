"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import type { Album } from "@/lib/types";
import { formatDate, formatRating } from "@/lib/format";

interface Point {
  x: number;
  y: number;
  album: Album;
}

const Y_MIN = 8;
const Y_MAX = 10;

/**
 * Y fixed to [8, 10]; X domain = [start, end] of the selected filter period.
 * Albums rated < 8 fall outside the fixed axis and are reported, not drawn.
 */
export default function ReleaseScatter({ albums, domain }: { albums: Album[]; domain: [number, number] }) {
  const router = useRouter();

  const { points, hidden } = useMemo(() => {
    const pts: Point[] = [];
    let hiddenCount = 0;
    for (const a of albums) {
      if (!a.release_date) continue;
      if (a.rating < Y_MIN) {
        hiddenCount++;
        continue;
      }
      const x = Date.parse(a.release_date);
      if (x >= domain[0] && x <= domain[1]) pts.push({ x, y: a.rating, album: a });
    }
    return { points: pts, hidden: hiddenCount };
  }, [albums, domain]);

  const ticks = useMemo(() => {
    const [from, to] = [new Date(domain[0]).getUTCFullYear(), new Date(domain[1]).getUTCFullYear()];
    const span = to - from;
    if (span === 0) return Array.from({ length: 12 }, (_, m) => Date.UTC(from, m, 1)).filter((_, m) => m % 2 === 0);
    const step = span <= 10 ? 1 : span <= 30 ? 5 : 10;
    const out: number[] = [];
    for (let y = Math.ceil(from / step) * step; y <= to; y += step) out.push(Date.UTC(y, 0, 1));
    return out;
  }, [domain]);

  const singleYear = new Date(domain[0]).getUTCFullYear() === new Date(domain[1]).getUTCFullYear();
  const fmtTick = (t: number) =>
    singleYear
      ? new Date(t).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })
      : String(new Date(t).getUTCFullYear());

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 12, right: 12, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            type="number"
            dataKey="x"
            scale="time"
            domain={domain}
            ticks={ticks}
            tickFormatter={fmtTick}
            allowDataOverflow
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[Y_MIN, Y_MAX]}
            ticks={[8, 8.5, 9, 9.5, 10]}
            allowDataOverflow
            tick={{ fill: "#52525b", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <ZAxis range={[44, 44]} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as Point | undefined;
              if (!active || !p) return null;
              return (
                <div className="glass flex items-center gap-3 rounded-xl px-3 py-2 text-xs">
                  <span
                    className="data rounded-md px-1.5 py-0.5 font-bold"
                    style={{ backgroundColor: p.album.rating_color, color: p.album.rating_text_color }}
                  >
                    {formatRating(p.album.rating)}
                  </span>
                  <span>
                    <span className="block font-medium text-white">{p.album.album}</span>
                    <span className="text-zinc-400">
                      {p.album.artist} · <span className="data">{formatDate(p.album.release_date)}</span>
                    </span>
                  </span>
                </div>
              );
            }}
          />
          <Scatter
            data={points}
            isAnimationActive
            animationDuration={600}
            onClick={(d: { payload?: Point }) => d.payload && router.push(`/album/${d.payload.album.id}`)}
            shape={(props: { cx?: number; cy?: number; payload?: Point }) => (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={4.5}
                fill={props.payload?.album.rating_color}
                fillOpacity={0.9}
                stroke="#05050a"
                strokeWidth={1}
                className="cursor-pointer transition-[r] duration-150 hover:[r:7]"
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
      {hidden > 0 && (
        <p className="mt-2 text-right text-[11px] text-zinc-600">
          {hidden} album{hidden > 1 ? "s" : ""} rated below 8 not shown
        </p>
      )}
    </div>
  );
}


"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Link from "next/link";
import type { Album, Palette } from "@/lib/types";
import { formatNumber, formatRating } from "@/lib/format";
import { useNearViewport } from "@/lib/useNearViewport";
import { Skeleton } from "@/components/ui/primitives";
import { FadeIn } from "@/components/motion/FadeIn";

// Recharts (~90kb gz) is split into its own chunk and only fetched when needed.
const RatingHistogram = dynamic(() => import("./RatingHistogram"), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px]" />,
});
const ReleaseScatter = dynamic(() => import("./ReleaseScatter"), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px]" />,
});

interface Props {
  albums: Album[];
  palette: Palette;
  domain: [number, number];
  periodLabel: string;
}

export function AnalyticsPanel({ albums, palette, domain, periodLabel }: Props) {
  const [ref, near] = useNearViewport<HTMLDivElement>("200px");

  const summary = useMemo(() => {
    if (!albums.length) return null;
    const avg = albums.reduce((s, a) => s + a.rating, 0) / albums.length;
    const best = albums.reduce((b, a) => (a.rating > b.rating || (a.rating === b.rating && a.scrobbles > b.scrobbles) ? a : b));
    const plays = albums.reduce((s, a) => s + a.scrobbles, 0);
    return { avg, best, plays };
  }, [albums]);

  return (
    <div ref={ref} className="space-y-4">
      {summary && (
        <FadeIn className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06]">
          <Stat label="Albums" value={formatNumber(albums.length)} />
          <Stat label="Average" value={summary.avg.toFixed(2)} />
          <Stat label="Plays" value={formatNumber(summary.plays)} />
        </FadeIn>
      )}

      {summary && (
        <FadeIn delay={0.05}>
          <Link
            href={`/album/${summary.best.id}`}
            className="glass group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.05]"
          >
            <span
              className="data grid size-12 shrink-0 place-items-center rounded-xl text-base font-black"
              style={{ backgroundColor: summary.best.rating_color, color: summary.best.rating_text_color }}
            >
              {formatRating(summary.best.rating)}
            </span>
            <span className="min-w-0">
              <span className="eyebrow block">Best of {periodLabel}</span>
              <span className="block truncate font-medium text-white">{summary.best.album}</span>
              <span className="block truncate text-xs text-zinc-500">{summary.best.artist}</span>
            </span>
            <span className="ml-auto text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-white">→</span>
          </Link>
        </FadeIn>
      )}

      <FadeIn delay={0.1} className="glass p-5">
        <ChartTitle title="Rating distribution" hint="0.5 buckets" />
        {near ? <RatingHistogram albums={albums} palette={palette} /> : <Skeleton className="h-[220px]" />}
      </FadeIn>

      <FadeIn delay={0.15} className="glass p-5">
        <ChartTitle title="Rating × release date" hint={periodLabel} />
        {near ? <ReleaseScatter albums={albums} domain={domain} /> : <Skeleton className="h-[260px]" />}
      </FadeIn>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-950/80 px-4 py-3 backdrop-blur">
      <p className="eyebrow !text-[10px]">{label}</p>
      <p className="data mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ChartTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="data text-[11px] text-zinc-500">{hint}</p>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import { api } from "@/lib/api";
import type { Album } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { useNearViewport } from "@/lib/useNearViewport";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { Flag } from "@/components/ui/Flag";

/** Fetches only when scrolled near; rows stream in with a stagger. */
export function TopRatedTable({ limit = 20 }: { limit?: number }) {
  const [ref, near] = useNearViewport<HTMLDivElement>("150px");
  const [rows, setRows] = useState<Album[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!near || rows) return;
    api.topRated(limit).then(setRows).catch(() => setError(true));
  }, [near, rows, limit]);

  return (
    <div ref={ref} className="glass overflow-hidden">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left">
            <th className="eyebrow w-14 py-4 pl-5 font-medium">#</th>
            <th className="eyebrow py-4 font-medium">Album</th>
            <th className="eyebrow hidden w-28 py-4 font-medium md:table-cell">Year</th>
            <th className="eyebrow hidden w-40 py-4 font-medium lg:table-cell">Genre</th>
            <th className="eyebrow hidden w-28 py-4 text-right font-medium sm:table-cell">Plays</th>
            <th className="eyebrow w-24 py-4 pr-5 text-right font-medium">Rating</th>
          </tr>
        </thead>
        <tbody>
          {error && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                Couldn’t load ratings.
              </td>
            </tr>
          )}

          {!rows && !error &&
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-white/[0.03]">
                <td colSpan={6} className="px-5 py-3">
                  <div className="shimmer h-8 rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
                </td>
              </tr>
            ))}

          {rows?.map((a, i) => (
            <m.tr
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.35, ease: "easeOut" }}
              className="group relative border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]"
            >
              <td className="data py-3 pl-5 text-xs text-zinc-500">{String(i + 1).padStart(2, "0")}</td>
              <td className="py-3 pr-4">
                <Link href={`/album/${a.id}`} className="block min-w-0 after:absolute after:inset-0">
                  <p className="truncate font-medium text-zinc-100 transition-colors group-hover:text-white">
                    {a.album}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-500">
                    <Flag code={a.country_code} name={a.country_name} />
                    {a.artist}
                  </p>
                </Link>
              </td>
              <td className="data hidden py-3 text-xs text-zinc-400 md:table-cell">{a.year ?? "—"}</td>
              <td className="hidden truncate py-3 pr-4 text-xs text-zinc-400 lg:table-cell">{a.genre || "—"}</td>
              <td className="data hidden py-3 text-right text-xs text-zinc-400 sm:table-cell">
                {formatNumber(a.scrobbles)}
              </td>
              <td className="py-3 pr-5 text-right">
                <RatingBadge rating={a.rating} color={a.rating_color} textColor={a.rating_text_color} />
              </td>
            </m.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


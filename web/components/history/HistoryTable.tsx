"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Album } from "@/lib/types";
import { formatDate, formatNumber, formatRating } from "@/lib/format";
import { Flag } from "@/components/ui/Flag";
import { RatingBadge } from "@/components/ui/RatingBadge";

type Key = "artist" | "album" | "release_date" | "genre" | "scrobbles" | "rating";
type Dir = "asc" | "desc";

const COLUMNS: { key: Key; label: string; className: string; numeric?: boolean }[] = [
  { key: "artist", label: "Artist", className: "w-[24%]" },
  { key: "album", label: "Album", className: "" },
  { key: "release_date", label: "Release", className: "hidden w-28 md:table-cell", numeric: true },
  { key: "genre", label: "Genre", className: "hidden w-36 lg:table-cell" },
  { key: "scrobbles", label: "Plays", className: "hidden w-24 text-right sm:table-cell", numeric: true },
  { key: "rating", label: "Rating", className: "w-24 pr-5 text-right", numeric: true },
];

const PAGE = 60;

export function HistoryTable({ albums }: { albums: Album[] }) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: Key; dir: Dir }>({ key: "rating", dir: "desc" });
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLTableRowElement>(null);

  const sorted = useMemo(() => {
    const m = sort.dir === "asc" ? 1 : -1;
    return [...albums].sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      // stable tie-breaker: rating desc, then artist
      return cmp * m || b.rating - a.rating || a.artist.localeCompare(b.artist);
    });
  }, [albums, sort]);

  // Reset windowing when the dataset/sort changes
  useEffect(() => setVisible(PAGE), [albums, sort]);

  // Incremental rendering: grow by PAGE rows when the sentinel nears the viewport
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e?.isIntersecting && setVisible((v) => Math.min(v + PAGE, sorted.length)),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sorted.length, visible]);

  const toggle = (key: Key, numeric?: boolean) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: numeric ? "desc" : "asc" }));

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
        <p className="text-sm text-zinc-400">
          <span className="data font-semibold text-white">{formatNumber(albums.length)}</span> albums
        </p>
        <p className="eyebrow">click headers to sort</p>
      </div>

      <div className="max-h-[78vh] overflow-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-ink-900/90 backdrop-blur-xl">
            <tr className="text-left">
              <th className="eyebrow w-12 py-3 pl-5 font-medium">#</th>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th key={c.key} className={clsx("py-3 font-medium", c.className, c.key === "rating" && "pr-2")}>
                    <button
                      onClick={() => toggle(c.key, c.numeric)}
                      className={clsx(
                        "eyebrow inline-flex items-center gap-1 transition-colors hover:text-zinc-200",
                        active && "!text-white",
                      )}
                    >
                      {c.label}
                      <span
                        className={clsx(
                          "inline-block transition-all duration-200",
                          active ? "opacity-100" : "opacity-0",
                          active && sort.dir === "asc" && "rotate-180",
                        )}
                      >
                        ↓
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, visible).map((a, i) => (
              <tr
                key={a.id}
                onClick={() => router.push(`/album/${a.id}`)}
                onMouseEnter={() => router.prefetch(`/album/${a.id}`)}
                className="group cursor-pointer border-b border-white/[0.03] transition-colors hover:bg-white/[0.035]"
              >
                <td className="data py-2.5 pl-5 text-[11px] text-zinc-600">{i + 1}</td>
                <td className="truncate py-2.5 pr-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Flag code={a.country_code} name={a.country_name} />
                    <span className="truncate font-medium text-zinc-200 group-hover:text-white">{a.artist}</span>
                  </span>
                </td>
                <td className="truncate py-2.5 pr-3 text-zinc-400 group-hover:text-zinc-200">
                  {a.award_color && (
                    <span
                      className="mr-2 inline-block size-2 rounded-full align-middle"
                      style={{ backgroundColor: a.award_color }}
                      title={`Award tier ${a.award}`}
                    />
                  )}
                  {a.album}
                </td>
                <td className="data hidden py-2.5 text-xs text-zinc-500 md:table-cell">{formatDate(a.release_date)}</td>
                <td className="hidden truncate py-2.5 pr-3 text-xs text-zinc-500 lg:table-cell">{a.genre || "—"}</td>
                <td className="data hidden py-2.5 pr-4 text-right text-xs text-zinc-500 sm:table-cell">
                  {a.scrobbles ? formatNumber(a.scrobbles) : "—"}
                </td>
                <td className="py-2.5 pr-5 text-right">
                  <RatingBadge rating={a.rating} color={a.rating_color} textColor={a.rating_text_color} size="sm" />
                </td>
              </tr>
            ))}
            {visible < sorted.length && (
              <tr ref={sentinel}>
                <td colSpan={7} className="py-6">
                  <div className="shimmer mx-5 h-8 rounded-lg" />
                </td>
              </tr>
            )}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-zinc-500">
                  Nothing listened in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


import clsx from "clsx";
import type { AlbumDetail } from "@/lib/types";
import { formatDuration, formatNumber } from "@/lib/format";
import { FadeIn } from "@/components/motion/FadeIn";

export function Tracklist({ album: a }: { album: AlbumDetail }) {
  const maxPlays = Math.max(1, ...a.tracks.map((t) => t.scrobbles ?? 0));
  const totalSec = a.tracks.reduce((s, t) => s + (t.duration ?? 0), 0);

  return (
    <section aria-labelledby="tracklist" className="mx-auto max-w-4xl">
      <FadeIn className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 id="tracklist" className="text-lg font-semibold tracking-tight text-white">
          Tracklist
        </h3>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-sm"
            style={{ borderColor: `${a.rating_color}66`, backgroundColor: `${a.rating_color}1a` }}
          >
            <span className="size-1.5 animate-pulse-dot rounded-full" style={{ backgroundColor: a.rating_color }} />
            <span className="text-zinc-400">Scrobbles:</span>
            <span className="data font-semibold text-white">{formatNumber(a.scrobbles)}</span>
          </span>
          {a.lastfm_url && (
            <a
              href={a.lastfm_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
            >
              Last.fm ↗
            </a>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.08} className="glass overflow-hidden">
        {a.tracks.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-zinc-500">No tracklist available on Last.fm.</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="eyebrow w-14 py-3.5 pl-6 font-medium">#</th>
                <th className="eyebrow py-3.5 font-medium">Title</th>
                <th className="eyebrow hidden w-48 py-3.5 font-medium sm:table-cell">Your plays</th>
                <th className="eyebrow w-20 py-3.5 pr-6 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {a.tracks.map((t) => (
                <tr
                  key={`${t.rank}-${t.name}`}
                  className={clsx(
                    "group border-b border-white/[0.03] transition-colors last:border-0 hover:bg-white/[0.03]",
                    t.is_top && "bg-white/[0.02]",
                  )}
                >
                  <td className="data py-3 pl-6 text-xs text-zinc-500 group-hover:text-zinc-300">
                    {String(t.rank).padStart(2, "0")}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-zinc-200 group-hover:text-white">{t.name}</span>
                      {t.is_top && (
                        <span
                          className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: a.rating_color, color: a.rating_text_color }}
                        >
                          Top
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hidden py-3 pr-6 sm:table-cell">
                    <span className="flex items-center gap-3">
                      <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                        <span
                          className="absolute inset-y-0 left-0 origin-left rounded-full transition-transform duration-700 group-hover:scale-x-105"
                          style={{
                            width: `${((t.scrobbles ?? 0) / maxPlays) * 100}%`,
                            backgroundColor: a.rating_color,
                          }}
                        />
                      </span>
                      <span className="data w-10 text-right text-xs text-zinc-400">{t.scrobbles ?? "—"}</span>
                    </span>
                  </td>
                  <td className="data py-3 pr-6 text-right text-xs text-zinc-400">{formatDuration(t.duration)}</td>
                </tr>
              ))}
            </tbody>
            {totalSec > 0 && (
              <tfoot>
                <tr className="border-t border-white/5">
                  <td colSpan={4} className="data px-6 py-3 text-right text-xs text-zinc-500">
                    {a.tracks.length} tracks · {Math.round(totalSec / 60)} min
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </FadeIn>
    </section>
  );
}


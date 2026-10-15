import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/api";
import type { Album } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { Cover } from "@/components/ui/Cover";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { Flag } from "@/components/ui/Flag";
import { FadeIn } from "@/components/motion/FadeIn";
import { SectionHeader, Skeleton } from "@/components/ui/primitives";

/** Bento grid: #1 hero tile + four satellites. Server component (zero JS except FadeIn). */
export async function TopOfYear() {
  const { year, albums } = await api.topOfYear();
  const currentYear = new Date().getFullYear();

  return (
    <section aria-labelledby="top5">
      <SectionHeader
        eyebrow="Most scrobbled"
        title={
          <span id="top5">
            Top 5 of <span className="data text-accent-soft">{year}</span>
          </span>
        }
        aside={
          year !== currentYear ? (
            <span className="text-xs text-zinc-500">No {currentYear} releases yet — showing latest year</span>
          ) : null
        }
      />

      {albums.length === 0 ? (
        <div className="glass grid h-64 place-items-center text-sm text-zinc-500">No albums for {year} yet.</div>
      ) : (
        <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {albums.map((a, i) => (
            <FadeIn
              key={a.id}
              delay={i * 0.07}
              className={clsx(
                "h-full w-full",
                i === 0 ? "col-span-2 row-span-2 aspect-square lg:aspect-auto" : "aspect-square",
              )}
            >
              <TopCard album={a} rank={i + 1} hero={i === 0} />
            </FadeIn>
          ))}
        </div>
      )}
    </section>
  );
}

function TopCard({ album: a, rank, hero }: { album: Album; rank: number; hero: boolean }) {
  return (
    <Link
      href={`/album/${a.id}`}
      className={clsx(
        "group relative block w-full overflow-hidden rounded-3xl border border-white/[0.08]",
        "transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1",
        "hover:shadow-[0_30px_80px_-30px_var(--rc)]",
        hero ? "aspect-square lg:aspect-auto lg:h-full min-h-[320px]" : "aspect-square h-full",
      )}
      style={{ ["--rc" as string]: a.rating_color }}
    >
      <div className="absolute inset-0">
        <Cover
          src={a.cover}
          alt={`${a.artist} – ${a.album}`}
          tint={a.rating_color}
          sizes={hero ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"}
          priority={hero}
          className="h-full w-full"
          imgClassName="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
        />
      </div>

      {/* Subtle legibility gradient: transparent on top, darker at the bottom for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/30 to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(80% 60% at 50% 100%, ${a.rating_color}, transparent)` }}
      />

      <span
        className={clsx(
          "absolute left-4 top-3 font-mono font-black leading-none text-transparent",
          "[-webkit-text-stroke:1px_rgba(255,255,255,0.45)]",
          hero ? "text-7xl sm:text-8xl" : "text-4xl sm:text-5xl",
        )}
      >
        {String(rank).padStart(2, "0")}
      </span>

      <div className="absolute right-3 top-3">
        <RatingBadge rating={a.rating} color={a.rating_color} textColor={a.rating_text_color} size={hero ? "lg" : "sm"} />
      </div>

      <div className={clsx("absolute inset-x-0 bottom-0", hero ? "p-6 sm:p-8" : "p-4")}>
        <p
          className={clsx(
            "truncate font-semibold tracking-tight text-white",
            hero ? "text-3xl sm:text-5xl" : "text-sm sm:text-base",
          )}
        >
          {a.album}
        </p>
        <p className={clsx("mt-1 flex items-center gap-2 truncate text-zinc-300", hero ? "text-base sm:text-lg" : "text-xs")}>
          <Flag code={a.country_code} name={a.country_name} />
          <span className="truncate">{a.artist}</span>
        </p>
        <p className={clsx("data mt-3 flex items-center gap-2 text-zinc-400", hero ? "text-sm" : "text-[11px]")}>
          <span className="size-1.5 rounded-full bg-accent-soft" />
          {formatNumber(a.scrobbles)} scrobbles
        </p>
      </div>
    </Link>
  );
}

export function TopOfYearSkeleton() {
  return (
    <section>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
        <Skeleton className="col-span-2 row-span-2 aspect-square rounded-3xl lg:aspect-auto" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-3xl" />
        ))}
      </div>
    </section>
  );
}


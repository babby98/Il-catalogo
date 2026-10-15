import { api } from "@/lib/api";
import { formatCompact, formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/primitives";

export async function HomeHero() {
  const s = await api.stats();
  const items = [
    { label: "Albums", value: formatNumber(s.albums) },
    { label: "Artists", value: formatNumber(s.artists) },
    { label: "Countries", value: formatNumber(s.countries) },
    { label: "Avg rating", value: s.avg_rating.toFixed(2) },
    { label: "Scrobbles", value: formatCompact(s.scrobbles) },
  ];

  return (
    <header className="space-y-10">
      <div>
        <p className="eyebrow mb-4">
          Since {s.first_year ?? "—"} · updated live
        </p>
        <h1 className="text-gradient max-w-3xl text-5xl font-bold leading-[0.95] tracking-tightest sm:text-7xl">
          Every record,
          <br />
          rated &amp; remembered.
        </h1>
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-5">
        {items.map((it) => (
          <div key={it.label} className="bg-ink-950/80 px-5 py-4 backdrop-blur">
            <dt className="eyebrow">{it.label}</dt>
            <dd className="data mt-1.5 text-2xl font-semibold text-white">{it.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

export function HomeHeroSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-16 w-full max-w-2xl" />
        <Skeleton className="h-16 w-3/4 max-w-xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}


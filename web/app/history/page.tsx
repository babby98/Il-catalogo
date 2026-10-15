import type { Metadata } from "next";
import { api } from "@/lib/api";
import { parsePeriod, periodLabel, periodRange } from "@/lib/format";
import { FilterBar } from "@/components/history/FilterBar";
import { HistoryTable } from "@/components/history/HistoryTable";
import { AnalyticsPanel } from "@/components/history/AnalyticsPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Archive" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const period = parsePeriod(searchParams);
  const [albums, periods, palette] = await Promise.all([api.albums(period), api.periods(), api.palette()]);
  const label = periodLabel(period);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow mb-3">Historical data</p>
        <h1 className="text-gradient text-4xl font-bold tracking-tightest sm:text-6xl">
          Archive <span className="data text-accent-soft/80">/ {label}</span>
        </h1>
      </header>

      <FilterBar periods={periods} current={period} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <HistoryTable albums={albums} />
        <aside className="xl:sticky xl:top-40">
          <AnalyticsPanel albums={albums} palette={palette} domain={periodRange(period, periods)} periodLabel={label} />
        </aside>
      </div>
    </div>
  );
}


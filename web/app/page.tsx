import { Suspense } from "react";
import Link from "next/link";
import { HomeHero, HomeHeroSkeleton } from "@/components/home/HomeHero";
import { TopOfYear, TopOfYearSkeleton } from "@/components/home/TopOfYear";
import { LazyHeatmap } from "@/components/home/LazyHeatmap";
import { LazyArtistNetwork } from "@/components/network/LazyArtistNetwork";
import { TopRatedTable } from "@/components/home/TopRatedTable";
import { ChartPlaceholders } from "@/components/home/ChartPlaceholders";
import { SectionHeader } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-24">
      <Suspense fallback={<HomeHeroSkeleton />}>
        <HomeHero />
      </Suspense>

      {/* Streams independently: Last.fm cover lookups never block the hero */}
      <Suspense fallback={<TopOfYearSkeleton />}>
        <TopOfYear />
      </Suspense>

      <section aria-labelledby="map">
        <SectionHeader eyebrow="Geography" title={<span id="map">Where the music comes from</span>} />
        <div className="glass p-4 sm:p-6">
          <LazyHeatmap />
        </div>
      </section>

      <section aria-labelledby="neural-network">
        <SectionHeader
          eyebrow="Machine Learning"
          title={<span id="neural-network">Rete Neurale Artisti</span>}
          aside={
            <span className="text-xs text-zinc-500">
              Autoencoder 16D latent space · Obsidian Graph View
            </span>
          }
        />
        <div className="glass p-4 sm:p-6">
          <LazyArtistNetwork />
        </div>
      </section>

      <section aria-labelledby="top20">
        <SectionHeader
          eyebrow="Hall of fame"
          title={<span id="top20">Top 20 of all time</span>}
          aside={
            <Link
              href="/history"
              className="group inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Full archive
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          }
        />
        <TopRatedTable limit={20} />
      </section>

      <section aria-labelledby="soon">
        <SectionHeader eyebrow="In the works" title={<span id="soon">More insights</span>} />
        <ChartPlaceholders />
      </section>
    </div>
  );
}


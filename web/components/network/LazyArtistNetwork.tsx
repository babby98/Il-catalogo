"use client";

import dynamic from "next/dynamic";
import { useNearViewport } from "@/lib/useNearViewport";
import { Skeleton } from "@/components/ui/primitives";

const ArtistNeuralGraph = dynamic(() => import("./ArtistNeuralGraph"), {
  ssr: false,
  loading: () => <NetworkSkeleton />,
});

function NetworkSkeleton() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-950/70 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <Skeleton className="h-8 w-60 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
      </div>
      <div className="mt-4 flex h-[520px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-xs text-zinc-500">Loading neural graph view…</p>
        </div>
      </div>
    </div>
  );
}

export function LazyArtistNetwork() {
  const [ref, near] = useNearViewport<HTMLDivElement>("300px");
  return <div ref={ref}>{near ? <ArtistNeuralGraph /> : <NetworkSkeleton />}</div>;
}


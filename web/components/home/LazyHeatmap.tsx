"use client";

import dynamic from "next/dynamic";
import { useNearViewport } from "@/lib/useNearViewport";
import { Skeleton } from "@/components/ui/primitives";

const WorldHeatmap = dynamic(() => import("./WorldHeatmap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>
    </div>
  );
}

/** Map JS + topojson (~120kb) only download when the section approaches the viewport. */
export function LazyHeatmap() {
  const [ref, near] = useNearViewport<HTMLDivElement>("300px");
  return <div ref={ref}>{near ? <WorldHeatmap /> : <MapSkeleton />}</div>;
}


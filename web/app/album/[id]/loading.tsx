import { Skeleton } from "@/components/ui/primitives";

export default function AlbumLoading() {
  return (
    <div className="space-y-20">
      <div className="grid items-end gap-8 md:grid-cols-[minmax(0,340px)_1fr] md:gap-12">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="relative space-y-5">
          <Skeleton className="absolute right-0 top-0 hidden size-36 rounded-[1.75rem] md:block" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-3">
        <Skeleton className="ml-auto h-8 w-44 rounded-full" />
        <Skeleton className="h-[420px] rounded-3xl" />
      </div>
    </div>
  );
}


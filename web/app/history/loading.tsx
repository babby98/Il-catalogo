import { Skeleton } from "@/components/ui/primitives";

export default function HistoryLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-14 w-80" />
      </div>
      <Skeleton className="h-14 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Skeleton className="h-[70vh] rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}


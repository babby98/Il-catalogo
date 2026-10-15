"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import type { Period, Periods } from "@/lib/types";

interface Props {
  periods: Periods;
  current: Period;
}

export function FilterBar({ periods, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const go = (p: Period) =>
    startTransition(() => {
      const qs = p.kind === "all" ? "" : `?${p.kind}=${p.value}`;
      router.push(`${pathname}${qs}`, { scroll: false });
    });

  const activeDecade =
    current.kind === "decade" ? current.value : current.kind === "year" ? current.value - (current.value % 10) : null;

  return (
    <div className="glass sticky top-20 z-30 flex flex-wrap items-center gap-3 rounded-2xl p-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        <Chip active={current.kind === "all"} onClick={() => go({ kind: "all" })}>
          All time
        </Chip>
        <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />
        {[...periods.decades].reverse().map((d) => (
          <Chip
            key={d}
            active={current.kind === "decade" && current.value === d}
            partial={current.kind === "year" && activeDecade === d}
            onClick={() => go({ kind: "decade", value: d })}
          >
            {d}s
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {pending && <span className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-accent-soft" />}
        <label className="relative">
          <span className="sr-only">Year</span>
          <select
            value={current.kind === "year" ? current.value : ""}
            onChange={(e) => (e.target.value ? go({ kind: "year", value: Number(e.target.value) }) : go({ kind: "all" }))}
            className={clsx(
              "data cursor-pointer appearance-none rounded-xl border bg-ink-900/80 py-2 pl-3.5 pr-9 text-[13px] outline-none transition-colors",
              current.kind === "year"
                ? "border-accent/50 text-white"
                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
            )}
          >
            <option value="">Specific year</option>
            {periods.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
        </label>
      </div>
    </div>
  );
}

function Chip({
  active,
  partial,
  onClick,
  children,
}: {
  active: boolean;
  partial?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "data shrink-0 rounded-xl px-3.5 py-2 text-[13px] transition-all duration-200 active:scale-95",
        active
          ? "bg-white text-ink-950 shadow-[0_8px_30px_-10px_rgba(255,255,255,0.5)]"
          : partial
            ? "bg-white/10 text-white"
            : "text-zinc-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}


import { FadeIn } from "@/components/motion/FadeIn";

const CARDS = [
  { title: "Genre distribution", hint: "Histogram · albums per genre", bars: 9 },
  { title: "Scrobbles over time", hint: "Monthly listening volume", bars: 14 },
  { title: "Labels", hint: "Most frequent record labels", bars: 7 },
];

/** Pure-CSS animated bars (transform only) — no chart lib shipped until real data exists. */
export function ChartPlaceholders() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CARDS.map((c, ci) => (
        <FadeIn key={c.title} delay={ci * 0.08} className="glass group relative overflow-hidden p-5">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">{c.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{c.hint}</p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Soon
            </span>
          </div>

          <div className="flex h-28 items-end gap-1.5">
            {Array.from({ length: c.bars }).map((_, i) => (
              <span
                key={i}
                className="flex-1 origin-bottom animate-bar-rise rounded-t-md bg-gradient-to-t from-accent/10 to-accent/50"
                style={{
                  height: `${35 + ((i * 37 + ci * 13) % 65)}%`,
                  animationDelay: `${(i * 0.12 + ci * 0.3).toFixed(2)}s`,
                }}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-accent/10 blur-3xl transition-opacity duration-700 group-hover:opacity-70" />
        </FadeIn>
      ))}
    </div>
  );
}


import Image from "next/image";
import type { AlbumDetail } from "@/lib/types";
import { formatDate, formatRating } from "@/lib/format";
import { Cover } from "@/components/ui/Cover";
import { Flag } from "@/components/ui/Flag";
import { Pill } from "@/components/ui/primitives";
import { FadeIn } from "@/components/motion/FadeIn";

export function AlbumHeader({ album: a }: { album: AlbumDetail }) {
  return (
    <section className="relative">
      {/* Ambient backdrop: 64px source upscaled + blurred = ~2kb, cheap and gorgeous */}
      {a.cover && (
        <div aria-hidden className="pointer-events-none absolute -inset-x-40 -top-40 -z-10 h-[620px] opacity-40">
          <Image src={a.cover} alt="" fill sizes="64px" quality={30} className="object-cover blur-3xl saturate-150" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/60 to-ink-950" />
        </div>
      )}

      <div className="grid items-end gap-8 md:grid-cols-[minmax(0,340px)_1fr] md:gap-12">
        <FadeIn y={20}>
          <Cover
            src={a.cover}
            alt={`${a.artist} – ${a.album}`}
            tint={a.rating_color}
            sizes="(min-width:768px) 340px, 90vw"
            priority
            className="aspect-square w-full rounded-3xl shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
          />
        </FadeIn>

        <div className="relative min-w-0 pb-1">
          {/* IMDb / Metacritic style score box */}
          <FadeIn delay={0.15} className="mb-6 flex justify-end md:absolute md:right-0 md:top-0 md:mb-0">
            <RatingBox album={a} />
          </FadeIn>

          <FadeIn delay={0.05} className="md:pr-44">
            <p className="eyebrow mb-3">{a.genre || "Album"}</p>
            <h1 className="break-words text-5xl font-black leading-[0.9] tracking-tightest text-white sm:text-7xl lg:text-8xl">
              {a.artist}
            </h1>
            <h2 className="mt-4 text-2xl font-light tracking-tight text-zinc-300 sm:text-3xl">{a.album}</h2>
          </FadeIn>

          <FadeIn delay={0.12} className="mt-8 flex flex-wrap items-center gap-2">
            <Pill>
              <span className="data text-white">{formatDate(a.release_date)}</span>
            </Pill>
            {a.country_code && (
              <Pill>
                <Flag code={a.country_code} name={a.country_name} showName />
              </Pill>
            )}
            {a.label && <Pill>{a.label}</Pill>}
            {a.tags
              .filter((t) => t.toLowerCase() !== a.genre.toLowerCase())
              .slice(0, 3)
              .map((t) => (
                <Pill key={t} className="text-zinc-400">
                  #{t.toLowerCase()}
                </Pill>
              ))}
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function RatingBox({ album: a }: { album: AlbumDetail }) {
  return (
    <div className="relative">
      <div
        className="absolute inset-0 -z-10 rounded-[1.75rem] opacity-60 blur-2xl"
        style={{ backgroundColor: a.rating_color }}
      />
      <div
        className="grid size-32 place-items-center rounded-[1.75rem] ring-1 ring-white/20 sm:size-36"
        style={{ backgroundColor: a.rating_color, color: a.rating_text_color }}
      >
        <div className="text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] opacity-70">Rating</p>
          <p className="data mt-1 text-5xl font-black leading-none tracking-tighter sm:text-6xl">
            {formatRating(a.rating)}
          </p>
          <p className="data mt-1 text-[11px] font-medium opacity-60">/ 10</p>
        </div>
      </div>
      {a.award && a.award_color && (
        <span
          className="absolute -right-2 -top-2 size-5 rounded-full ring-4 ring-ink-950"
          style={{ backgroundColor: a.award_color }}
          title={`Award tier ${a.award}`}
        />
      )}
    </div>
  );
}


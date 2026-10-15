import Image from "next/image";
import clsx from "clsx";
import { initials } from "@/lib/format";

interface Props {
  src?: string | null;
  alt: string;
  /** Used to tint the fallback artwork */
  tint?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}

/** Album art with a generated fallback. Uses direct img with no-referrer for fast unbuffered external loads. */
export function Cover({ src, alt, tint = "#7c5cff", priority, className, imgClassName }: Props) {
  const isAbsolute = className?.includes("absolute");
  return (
    <div className={clsx(isAbsolute ? "absolute inset-0" : "relative", "h-full w-full overflow-hidden bg-ink-800", className)}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={clsx("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            background: `radial-gradient(120% 120% at 0% 0%, ${tint}aa, transparent 60%), linear-gradient(135deg, #13131f, #05050a)`,
          }}
          aria-label={alt}
          role="img"
        >
          <span className="font-mono text-[clamp(1rem,6cqw,3rem)] font-bold text-white/70">{initials(alt)}</span>
        </div>
      )}
    </div>
  );
}


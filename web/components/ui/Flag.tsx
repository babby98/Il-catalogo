/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";
import { flagEmoji, flagUrl } from "@/lib/format";

interface Props {
  code: string | null;
  name?: string | null;
  className?: string;
  showName?: boolean;
}

/**
 * Image flags (Windows doesn't render regional-indicator emoji), emoji as alt text.
 * Tiny PNGs from flagcdn, lazily loaded.
 */
export function Flag({ code, name, className, showName }: Props) {
  if (!code) return null;
  return (
    <span className={clsx("inline-flex items-center gap-2", className)} title={name ?? code}>
      <img
        src={flagUrl(code, 40)}
        srcSet={`${flagUrl(code, 80)} 2x`}
        alt={flagEmoji(code)}
        width={20}
        height={15}
        loading="lazy"
        decoding="async"
        className="h-[0.9em] w-auto rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
      />
      {showName && <span>{name ?? code}</span>}
    </span>
  );
}


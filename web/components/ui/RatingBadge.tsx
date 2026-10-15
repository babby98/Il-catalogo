import clsx from "clsx";
import { formatRating } from "@/lib/format";

type Size = "xs" | "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  xs: "h-6 min-w-[2.6rem] rounded-md px-1.5 text-[11px]",
  sm: "h-7 min-w-[3rem] rounded-lg px-2 text-xs",
  md: "h-9 min-w-[3.6rem] rounded-xl px-2.5 text-sm",
  lg: "h-12 min-w-[4.5rem] rounded-2xl px-3 text-lg",
};

interface Props {
  rating: number;
  /** Hex from ColorScheme.py (rating_color) */
  color: string;
  /** Hex from ColorScheme.py (rating_text_color) */
  textColor?: string;
  size?: Size;
  className?: string;
}

/** Every rating chip in the app renders through here -> one source of truth for colour. */
export function RatingBadge({ rating, color, textColor = "#fff", size = "sm", className }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center font-mono font-bold tabular-nums",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_20px_-8px_var(--rc)]",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color, color: textColor, ["--rc" as string]: color }}
    >
      {formatRating(rating)}
    </span>
  );
}


import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("shimmer rounded-xl", className)} />;
}

interface SectionHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ eyebrow, title, aside, className }: SectionHeaderProps) {
  return (
    <div className={clsx("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  );
}


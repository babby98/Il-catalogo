import type { Period, Periods } from "./types";

const nf = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const formatNumber = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));
export const formatCompact = (n: number) => compact.format(n);

/** 8 -> "8.0", 8.25 -> "8.25", 7.5 -> "7.5" */
export function formatRating(r: number): string {
  return Number.isInteger(r) ? r.toFixed(1) : String(Number(r.toFixed(2)));
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  // Sheet often has year-only values stored as Jan 1st -> show only the year
  if (d.getUTCMonth() === 0 && d.getUTCDate() === 1) return String(d.getUTCFullYear());
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function flagUrl(code: string, width: 20 | 40 | 80 | 160 = 40) {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function initials(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/* ------------------------------------------------------------------ */
/* Periods                                                             */
/* ------------------------------------------------------------------ */

export function parsePeriod(sp: Record<string, string | string[] | undefined>): Period {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const year = Number(one(sp.year));
  if (Number.isInteger(year) && year > 1900) return { kind: "year", value: year };
  const decade = Number(one(sp.decade));
  if (Number.isInteger(decade) && decade > 1900) return { kind: "decade", value: decade - (decade % 10) };
  return { kind: "all" };
}

export function periodLabel(p: Period): string {
  if (p.kind === "year") return String(p.value);
  if (p.kind === "decade") return `${p.value}s`;
  return "All time";
}

/** [startMs, endMs] used as the scatterplot X domain. */
export function periodRange(p: Period, periods: Periods): [number, number] {
  let from: number;
  let to: number;
  if (p.kind === "year") [from, to] = [p.value, p.value];
  else if (p.kind === "decade") [from, to] = [p.value, p.value + 9];
  else {
    const ys = periods.years;
    from = ys.length ? Math.min(...ys) : 1960;
    to = ys.length ? Math.max(...ys) : new Date().getFullYear();
  }
  return [Date.UTC(from, 0, 1), Date.UTC(to, 11, 31, 23, 59, 59)];
}


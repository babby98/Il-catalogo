import type {
  Album,
  AlbumDetail,
  CountriesResponse,
  Palette,
  Period,
  Periods,
  Stats,
  TopOfYear,
} from "./types";

/**
 * Server components talk to the Python API directly; the browser uses the
 * same-origin `/api/*` rewrite declared in next.config.mjs.
 */
const BASE =
  typeof window === "undefined" ? process.env.API_URL ?? "http://127.0.0.1:8000" : "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

function periodQuery(p: Period): string {
  if (p.kind === "year") return `?year=${p.value}`;
  if (p.kind === "decade") return `?decade=${p.value}`;
  return "";
}

export const api = {
  stats: () => get<Stats>("/api/stats"),
  periods: () => get<Periods>("/api/periods"),
  palette: () => get<Palette>("/api/palette"),
  topOfYear: (year?: number) => get<TopOfYear>(`/api/top-of-year${year ? `?year=${year}` : ""}`),
  topRated: (limit = 20) => get<Album[]>(`/api/top-rated?limit=${limit}`),
  countries: () => get<CountriesResponse>("/api/countries"),
  albums: (p: Period = { kind: "all" }) => get<Album[]>(`/api/albums${periodQuery(p)}`),
  album: (id: string) => get<AlbumDetail>(`/api/albums/${encodeURIComponent(id)}`),
};


export interface Album {
  id: string;
  artist: string;
  album: string;
  release_date: string | null;
  year: number | null;
  label: string;
  genre: string;
  top_song: string;
  rating: number;
  /** Background hex from ColorScheme.color_vote_list */
  rating_color: string;
  /** Foreground hex from ColorScheme.color_vote_list */
  rating_text_color: string;
  award: number | null;
  award_color: string | null;
  scrobbles: number;
  country_code: string | null;
  country_name: string | null;
  cover?: string | null;
}

export interface Track {
  rank: number;
  name: string;
  duration: number | null;
  scrobbles: number | null;
  is_top: boolean;
}

export interface AlbumDetail extends Album {
  cover: string | null;
  lastfm_url: string | null;
  tags: string[];
  tracks: Track[];
}

export interface TopOfYear {
  year: number;
  albums: Album[];
}

export interface CountryCount {
  code: string;
  numeric: string;
  name: string;
  count: number;
}

export interface CountriesResponse {
  countries: CountryCount[];
  pending: number;
}

export interface Stats {
  albums: number;
  artists: number;
  countries: number;
  avg_rating: number;
  scrobbles: number;
  first_year: number | null;
  last_year: number | null;
}

export interface Periods {
  years: number[];
  decades: number[];
}

export type Palette = Record<string, { bg: string; fg: string }>;

export type Period =
  | { kind: "all" }
  | { kind: "decade"; value: number }
  | { kind: "year"; value: number };


"""
Il Catalogo — REST API
======================

Thin FastAPI layer over the same Google Sheet used by the Streamlit app.
Every album carries `rating_color` / `rating_text_color`, computed with
`ColorScheme.color_vote_list`, so the web frontend inherits the exact palette.

Enrichment:
  * Last.fm      -> cover art, tracklist, live user scrobbles (album + track)
  * MusicBrainz  -> band nationality (resolved in background, cached on disk)

Run:
    pip install -r requirements.txt
    uvicorn api:app --reload --port 8000
"""
from __future__ import annotations

import functools
import json
import os
import re
import threading
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote

import pandas as pd
import pycountry
import requests
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPRegressor
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import ColorScheme as csc

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
SHEET_ID = "1OJXM5FtgFeDBllXsGmozXV2jAlLPiWif5vPqOjYx1Us"
SOURCE_SHEETS = ["DAL 2015", "PRIMA DEL 2015"]  # union = full catalogue

LASTFM_URL = "https://ws.audioscrobbler.com/2.0/"
LASTFM_API_KEY = os.getenv("LASTFM_API_KEY", "e41a6874e211bc73ebc9ae65993ab928")
LASTFM_USER = os.getenv("LASTFM_USER", "Babby98")

DATA_TTL = int(os.getenv("CATALOGO_DATA_TTL", "600"))       # sheet cache (s)
LASTFM_TTL = int(os.getenv("CATALOGO_LASTFM_TTL", "1800"))  # last.fm cache (s)
COUNTRY_CACHE_FILE = Path(__file__).with_name("country_cache.json")
LASTFM_CACHE_FILE = Path(__file__).with_name("lastfm_cache.json")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "CATALOGO_CORS", "http://localhost:3000,http://127.0.0.1:3000,https://il-catalogo.onrender.com").split(",")]

HTTP = requests.Session()
HTTP.headers["User-Agent"] = "IlCatalogo/0.2 ( https://github.com/babby98/Il-catalogo )"
POOL = ThreadPoolExecutor(max_workers=6)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def ttl_cache(seconds: int) -> Callable:
    """Tiny thread-safe TTL memoizer for hashable positional args."""
    def deco(fn: Callable) -> Callable:
        store: dict[tuple, tuple[float, Any]] = {}
        lock = threading.Lock()

        @functools.wraps(fn)
        def wrapper(*args):
            now = time.time()
            with lock:
                hit = store.get(args)
                if hit and now - hit[0] < seconds:
                    return hit[1]
            value = fn(*args)
            with lock:
                store[args] = (now, value)
            return value
        return wrapper
    return deco


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _to_int(val: Any) -> int:
    if val is None or (isinstance(val, float) and pd.isna(val)) or val == "":
        return 0
    try:
        return int(float(val))
    except (TypeError, ValueError):
        digits = re.sub(r"\D", "", str(val))
        return int(digits) if digits else 0


def _parse_release(val: Any) -> date | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    if not s:
        return None
    year_only = re.fullmatch(r"(\d{4})(?:\.0)?", s)
    if year_only:
        return date(int(year_only.group(1)), 1, 1)
    ts = pd.to_datetime(s, dayfirst=True, errors="coerce")
    return None if pd.isna(ts) else ts.date()


def _clean_str(val: Any) -> str:
    return "" if val is None or (isinstance(val, float) and pd.isna(val)) else str(val).strip()


# --------------------------------------------------------------------------- #
# Country resolution (MusicBrainz, 1 req/s, disk cache)
# --------------------------------------------------------------------------- #
class CountryResolver:
    _ERROR = object()

    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        self.cache: dict[str, str | None] = {}
        if path.exists():
            try:
                self.cache = json.loads(path.read_text("utf-8"))
            except json.JSONDecodeError:
                self.cache = {}
        self.queue: list[str] = []
        self.queued: set[str] = set()
        self.event = threading.Event()
        threading.Thread(target=self._worker, daemon=True).start()

    @staticmethod
    def key(artist: str) -> str:
        return artist.casefold().strip()

    def lookup(self, artist: str) -> str | None:
        return self.cache.get(self.key(artist))

    def pending(self) -> int:
        return len(self.queue)

    def enqueue(self, artists: set[str]) -> None:
        with self.lock:
            for a in sorted(artists):
                k = self.key(a)
                if k not in self.cache and k not in self.queued:
                    self.queue.append(a)
                    self.queued.add(k)
        self.event.set()

    def _save(self) -> None:
        with self.lock:
            data = json.dumps(self.cache, ensure_ascii=False, indent=1, sort_keys=True)
        self.path.write_text(data, "utf-8")

    def _query(self, artist: str):
        try:
            r = HTTP.get(
                "https://musicbrainz.org/ws/2/artist/",
                params={"query": f'artist:"{artist.replace(chr(34), "")}"', "fmt": "json", "limit": 1},
                timeout=10,
            )
            r.raise_for_status()
            hits = r.json().get("artists", [])
            if hits and int(hits[0].get("score", 0)) >= 90:
                return hits[0].get("country")
            return None
        except Exception:
            return self._ERROR

    def _worker(self) -> None:
        dirty = 0
        while True:
            self.event.wait()
            with self.lock:
                artist = self.queue.pop(0) if self.queue else None
                if artist is None:
                    self.event.clear()
            if artist is None:
                if dirty:
                    self._save()
                    dirty = 0
                continue
            code = self._query(artist)
            with self.lock:
                self.queued.discard(self.key(artist))
                if code is not self._ERROR:
                    self.cache[self.key(artist)] = code
                    dirty += 1
            if dirty >= 10:
                self._save()
                dirty = 0
            time.sleep(1.1)  # MusicBrainz rate limit


countries = CountryResolver(COUNTRY_CACHE_FILE)


@functools.lru_cache(maxsize=512)
def country_info(code: str | None) -> dict | None:
    if not code:
        return None
    c = pycountry.countries.get(alpha_2=code.upper())
    if not c:
        return None
    return {"code": c.alpha_2, "numeric": c.numeric,
            "name": getattr(c, "common_name", None) or c.name}


# --------------------------------------------------------------------------- #
# Sheet loading
# --------------------------------------------------------------------------- #
_COLUMNS = ["ARTISTA", "ALBUM", "RELEASE", "AWARD", "LABEL", "VOTO", "GENERE", "TOP CANZONE", "SCROBBLES"]
_data_lock = threading.Lock()
_data: dict[str, Any] = {"ts": 0.0, "albums": [], "index": {}}


def _load_sheet(name: str) -> pd.DataFrame:
    url = (f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq"
           f"?tqx=out:csv&sheet={quote(name)}")
    df = pd.read_csv(url).iloc[:, 1:10]
    df.columns = _COLUMNS
    df = df.dropna(subset=["ARTISTA", "VOTO"])
    df["VOTO"] = pd.to_numeric(df["VOTO"].astype(str).str.replace(",", "."), errors="coerce")
    return df.dropna(subset=["VOTO"])


def _build_records(df: pd.DataFrame) -> list[dict]:
    df = df.copy()
    df["ARTISTA"] = df["ARTISTA"].astype(str).str.strip().str.title()
    df["ALBUM"] = df["ALBUM"].astype(str).str.strip().str.title()
    df = df.drop_duplicates(subset=["ARTISTA", "ALBUM"])

    records, seen = [], set()
    for row in df.itertuples(index=False):
        rating = round(float(row.VOTO), 2)
        bg, fg = csc.color_vote_list(rating)
        released = _parse_release(row.RELEASE)
        award = _to_int(row.AWARD) or None

        base_id = f"{slugify(row.ARTISTA)}--{slugify(row.ALBUM)}"
        album_id, n = base_id, 2
        while album_id in seen:
            album_id, n = f"{base_id}-{n}", n + 1
        seen.add(album_id)

        records.append({
            "id": album_id,
            "artist": row.ARTISTA,
            "album": row.ALBUM,
            "release_date": released.isoformat() if released else None,
            "year": released.year if released else None,
            "label": _clean_str(row.LABEL),
            "genre": _clean_str(row.GENERE),
            "top_song": _clean_str(row._7).title(),  # "TOP CANZONE"
            "rating": rating,
            "rating_color": bg,
            "rating_text_color": fg,
            "award": award,
            "award_color": csc.color_award_list(award) if award else None,
            "scrobbles": _to_int(row.SCROBBLES),
        })
    return records


def get_albums() -> list[dict]:
    with _data_lock:
        if _data["albums"] and time.time() - _data["ts"] < DATA_TTL:
            return _data["albums"]
    try:
        df = pd.concat([_load_sheet(s) for s in SOURCE_SHEETS], ignore_index=True)
        albums = _build_records(df)
    except Exception as exc:
        if _data["albums"]:  # serve stale data rather than fail
            return _data["albums"]
        raise HTTPException(503, f"Unable to load catalogue: {exc}") from exc
    with _data_lock:
        _data.update(ts=time.time(), albums=albums, index={a["id"]: a for a in albums})
    countries.enqueue({a["artist"] for a in albums})
    lastfm_resolver.enqueue([(a["artist"], a["album"]) for a in sorted(albums, key=lambda x: -x["rating"])])
    return albums


# --------------------------------------------------------------------------- #
# Last.fm & Disk Resolver
# --------------------------------------------------------------------------- #
def _lastfm(method: str, **params) -> dict:
    r = HTTP.get(LASTFM_URL, timeout=10, params={
        "method": method, "api_key": LASTFM_API_KEY, "username": LASTFM_USER,
        "autocorrect": 1, "format": "json", **params})
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise LookupError(data.get("message", "Last.fm error"))
    return data


def _hq_image(images: list[dict] | None) -> str | None:
    url = next((i.get("#text") for i in reversed(images or []) if i.get("#text")), None)
    return re.sub(r"/i/u/[^/]+/", "/i/u/770x0/", url) if url else None


def _as_list(val: Any) -> list:
    if isinstance(val, list):
        return val
    return [val] if isinstance(val, dict) else []


def _fetch_lastfm_album(artist: str, album: str) -> dict | None:
    try:
        data = _lastfm("album.getinfo", artist=artist, album=album)["album"]
    except Exception:
        return None
    tags = data.get("tags")
    tracks = _as_list((data.get("tracks") or {}).get("track"))
    return {
        "cover": _hq_image(data.get("image")),
        "scrobbles": _to_int(data.get("userplaycount")),
        "url": data.get("url"),
        "tags": [t.get("name") for t in _as_list(tags.get("tag") if isinstance(tags, dict) else None)][:5],
        "tracks": [{
            "rank": _to_int((t.get("@attr") or {}).get("rank")) or i + 1,
            "name": t.get("name", ""),
            "duration": _to_int(t.get("duration")) or None,
            "artist": (t.get("artist") or {}).get("name", artist),
        } for i, t in enumerate(tracks)],
    }


class LastfmResolver:
    _ERROR = object()

    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        self.cache: dict[str, dict] = {}
        if path.exists():
            try:
                self.cache = json.loads(path.read_text("utf-8"))
            except Exception:
                self.cache = {}
        self.queue: list[tuple[str, str]] = []
        self.queued: set[str] = set()
        self.event = threading.Event()
        threading.Thread(target=self._worker, daemon=True).start()

    @staticmethod
    def key(artist: str, album: str) -> str:
        return f"{slugify(artist)}--{slugify(album)}"

    def lookup(self, artist: str, album: str) -> dict | None:
        return self.cache.get(self.key(artist, album))

    def get_scrobbles(self, artist: str, album: str) -> int:
        entry = self.lookup(artist, album)
        return int(entry.get("scrobbles") or 0) if entry else 0

    def get_cover(self, artist: str, album: str) -> str | None:
        entry = self.lookup(artist, album)
        return entry.get("cover") if entry else None

    def store(self, artist: str, album: str, data: dict) -> None:
        k = self.key(artist, album)
        with self.lock:
            self.cache[k] = data
            self._save_locked()

    def enqueue(self, items: list[tuple[str, str]]) -> None:
        with self.lock:
            for artist, album in items:
                k = self.key(artist, album)
                if k not in self.cache and k not in self.queued:
                    self.queue.append((artist, album))
                    self.queued.add(k)
        self.event.set()

    def _save_locked(self) -> None:
        try:
            temp = self.path.with_suffix(".tmp")
            temp.write_text(json.dumps(self.cache, ensure_ascii=False, indent=1), "utf-8")
            temp.replace(self.path)
        except Exception:
            pass

    def _worker(self) -> None:
        dirty = 0
        while True:
            self.event.wait()
            with self.lock:
                item = self.queue.pop(0) if self.queue else None
                if item is None:
                    self.event.clear()
            if item is None:
                if dirty:
                    with self.lock:
                        self._save_locked()
                    dirty = 0
                continue
            artist, album = item
            data = _fetch_lastfm_album(artist, album)
            with self.lock:
                self.queued.discard(self.key(artist, album))
                if data is not None and data is not self._ERROR:
                    self.cache[self.key(artist, album)] = data
                    dirty += 1
            if dirty >= 5:
                with self.lock:
                    self._save_locked()
                dirty = 0
            time.sleep(0.3)  # Gentle rate limit


lastfm_resolver = LastfmResolver(LASTFM_CACHE_FILE)


def serialize(a: dict) -> dict:
    info = country_info(countries.lookup(a["artist"]))
    cached_scrobbles = lastfm_resolver.get_scrobbles(a["artist"], a["album"])
    cached_cover = lastfm_resolver.get_cover(a["artist"], a["album"])
    return {
        **a,
        "scrobbles": max(a.get("scrobbles", 0), cached_scrobbles),
        "cover": a.get("cover") or cached_cover,
        "country_code": info["code"] if info else None,
        "country_name": info["name"] if info else None,
    }


def lastfm_album(artist: str, album: str) -> dict | None:
    cached = lastfm_resolver.lookup(artist, album)
    if cached is not None:
        return cached
    data = _fetch_lastfm_album(artist, album)
    if data is not None:
        lastfm_resolver.store(artist, album, data)
    return data


@ttl_cache(LASTFM_TTL)
def lastfm_track_plays(artist: str, track: str) -> int | None:
    try:
        return _to_int(_lastfm("track.getInfo", artist=artist, track=track)["track"].get("userplaycount"))
    except Exception:
        return None


def with_cover(a: dict) -> dict:
    lf = lastfm_album(a["artist"], a["album"])
    out = serialize(a)
    if lf:
        out["cover"] = lf.get("cover") or out.get("cover")
        out["scrobbles"] = max(out.get("scrobbles", 0), lf.get("scrobbles", 0))
    return out


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
app = FastAPI(title="Il Catalogo API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS,
                   allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/albums")
def list_albums(decade: int | None = None, year: int | None = None):
    albums = get_albums()
    if year is not None:
        albums = [a for a in albums if a["year"] == year]
    elif decade is not None:
        albums = [a for a in albums if a["year"] and decade <= a["year"] < decade + 10]
    albums = sorted(albums, key=lambda a: (-a["rating"], -a["scrobbles"], a["artist"]))
    return [serialize(a) for a in albums]


@app.get("/api/periods")
def periods():
    years = sorted({a["year"] for a in get_albums() if a["year"]}, reverse=True)
    return {"years": years, "decades": sorted({y // 10 * 10 for y in years}, reverse=True)}


@app.get("/api/palette")
def palette():
    """Rating -> colours (0.0 … 10.0, step 0.1) straight from ColorScheme.py."""
    out = {}
    for i in range(0, 101):
        bg, fg = csc.color_vote_list(i / 10)
        out[f"{i / 10:.1f}"] = {"bg": bg, "fg": fg}
    return out


@app.get("/api/stats")
def stats():
    albums = get_albums()
    serialized = [serialize(a) for a in albums]
    years = [a["year"] for a in albums if a["year"]]
    codes = {countries.lookup(a["artist"]) for a in albums} - {None}
    return {
        "albums": len(albums),
        "artists": len({a["artist"] for a in albums}),
        "countries": len(codes),
        "avg_rating": round(sum(a["rating"] for a in albums) / max(len(albums), 1), 2),
        "scrobbles": sum(a["scrobbles"] for a in serialized),
        "first_year": min(years) if years else None,
        "last_year": max(years) if years else None,
    }


@app.get("/api/top-rated")
def top_rated(limit: int = Query(20, ge=1, le=100)):
    albums = get_albums()
    candidates = sorted(albums, key=lambda a: -a["rating"])[:limit + 15]
    enriched = list(POOL.map(with_cover, candidates))
    enriched.sort(key=lambda a: (-a["rating"], -a["scrobbles"]))
    return enriched[:limit]


@app.get("/api/top-of-year")
def top_of_year(year: int | None = None, limit: int = Query(5, ge=1, le=20)):
    albums = get_albums()
    target = year or date.today().year
    pool = [a for a in albums if a["year"] == target]
    if not pool and year is None:
        years = [a["year"] for a in albums if a["year"]]
        if years:
            target = max(years)
            pool = [a for a in albums if a["year"] == target]
    enriched = list(POOL.map(with_cover, pool))
    enriched.sort(key=lambda a: (-a["scrobbles"], -a["rating"]))
    return {"year": target, "albums": enriched[:limit]}


@app.get("/api/countries")
def country_counts():
    artists_by_code: dict[str, set[str]] = {}
    for a in get_albums():
        code = countries.lookup(a["artist"])
        if code:
            artists_by_code.setdefault(code, set()).add(a["artist"])
    result = []
    for code, artists in artists_by_code.items():
        info = country_info(code)
        if info:
            result.append({**info, "count": len(artists)})
    result.sort(key=lambda c: -c["count"])
    return {"countries": result, "pending": countries.pending()}


@app.get("/api/albums/{album_id}")
def album_detail(album_id: str):
    get_albums()
    a = _data["index"].get(album_id)
    if not a:
        raise HTTPException(404, "Album not found")

    out = serialize(a)
    lf = lastfm_album(a["artist"], a["album"])
    top_key = slugify(a["top_song"])
    tracks = []
    if lf:
        plays = list(POOL.map(lambda t: lastfm_track_plays(t["artist"], t["name"]), lf["tracks"]))
        tracks = [{
            "rank": t["rank"], "name": t["name"], "duration": t["duration"],
            "scrobbles": p, "is_top": bool(top_key) and slugify(t["name"]) == top_key,
        } for t, p in zip(lf["tracks"], plays)]

    out.update({
        "cover": lf["cover"] if lf else None,
        "scrobbles": lf["scrobbles"] if lf else a["scrobbles"],
        "lastfm_url": lf["url"] if lf else None,
        "tags": lf["tags"] if lf else [],
        "tracks": tracks,
    })
    return out


# --------------------------------------------------------------------------- #
# Neural Network Autoencoder & Artist Graph
# --------------------------------------------------------------------------- #
def _extract_shared_traits(a1: dict, a2: dict) -> list[str]:
    traits: list[str] = []
    # Common genres
    common_genres = sorted(list(a1["_genres"] & a2["_genres"]))
    for g in common_genres:
        if g not in traits:
            traits.append(g)
            if len(traits) >= 4:
                return traits
    # Same nationality
    if a1["country_name"] and a1["country_name"] == a2["country_name"]:
        traits.append(a1["country_name"])
        if len(traits) >= 4:
            return traits
    # Common Last.fm tags
    common_tags = sorted(list(a1["_tags"] & a2["_tags"]))
    for t in common_tags:
        clean = t.title()
        if clean not in traits and t not in ["seen live", "albums i own", "favorites"]:
            traits.append(clean)
            if len(traits) >= 4:
                return traits
    # Common record labels
    common_labels = sorted(list(a1["_labels"] & a2["_labels"]))
    for lb in common_labels:
        if lb and lb != "-" and lb not in traits:
            traits.append(lb)
            if len(traits) >= 4:
                return traits
    return traits[:4]


@ttl_cache(600)
def get_neural_artist_network() -> tuple[list[dict], np.ndarray, dict[str, int]]:
    albums = get_albums()
    artists_map: dict[str, dict] = {}
    for a in albums:
        name = a["artist"]
        if name not in artists_map:
            code = countries.lookup(name)
            info = country_info(code)
            artists_map[name] = {
                "id": slugify(name),
                "name": name,
                "country_code": info["code"] if info else None,
                "country_name": info["name"] if info else None,
                "albums": [],
                "_genres": set(),
                "_labels": set(),
                "_tags": set(),
                "_ratings": [],
                "_years": [],
                "scrobbles": 0,
                "cover": None,
            }

        artists_map[name]["albums"].append({
            "id": a["id"],
            "album": a["album"],
            "rating": a["rating"],
            "rating_color": a["rating_color"],
            "year": a["year"],
            "cover": a.get("cover"),
        })
        if a.get("cover") and not artists_map[name]["cover"]:
            artists_map[name]["cover"] = a["cover"]
        if a.get("genre"):
            artists_map[name]["_genres"].add(a["genre"].strip())
        if a.get("label"):
            artists_map[name]["_labels"].add(a["label"].strip())
        if a.get("rating"):
            artists_map[name]["_ratings"].append(a["rating"])
        if a.get("year"):
            artists_map[name]["_years"].append(a["year"])
        artists_map[name]["scrobbles"] += a.get("scrobbles", 0)

        # Check Last.fm cache for tags and cover
        k = lastfm_resolver.key(a["artist"], a["album"])
        entry = lastfm_resolver.cache.get(k)
        if entry:
            if entry.get("cover") and not artists_map[name]["cover"]:
                artists_map[name]["cover"] = entry["cover"]
            if entry.get("tags"):
                for t in entry["tags"]:
                    artists_map[name]["_tags"].add(str(t).strip().lower())

    artist_list = list(artists_map.values())
    text_corpus: list[str] = []
    numeric_features: list[list[float]] = []

    for a in artist_list:
        a["album_count"] = len(a["albums"])
        avg_rating = round(float(np.mean(a["_ratings"])), 2) if a["_ratings"] else 7.0
        a["avg_rating"] = avg_rating
        bg, fg = csc.color_vote_list(avg_rating)
        a["rating_color"] = bg
        a["rating_text_color"] = fg
        a["genres"] = sorted(list(a["_genres"]))
        a["tags"] = sorted(list(a["_tags"]))[:8]
        # Sort albums descending by rating
        a["albums"].sort(key=lambda x: -x["rating"])

        text_parts = list(a["_genres"]) + list(a["_tags"]) + list(a["_labels"])
        if a["country_name"]:
            text_parts.append(a["country_name"])
        text_corpus.append(" ".join(text_parts) if text_parts else "music")

        avg_y = float(np.mean(a["_years"])) if a["_years"] else 2010.0
        log_s = float(np.log1p(a["scrobbles"]))
        numeric_features.append([avg_y, avg_rating, log_s])

    # Feature representation: TF-IDF + StandardScaler
    vec = TfidfVectorizer(max_features=256, stop_words="english")
    X_text = vec.fit_transform(text_corpus).toarray()
    scaler = StandardScaler()
    X_num = scaler.fit_transform(numeric_features)
    X = np.hstack([X_text, X_num])

    # Autoencoder compression to 16 dimensions
    mlp = MLPRegressor(
        hidden_layer_sizes=(64, 16, 64),
        activation="relu",
        max_iter=160,
        random_state=42,
        early_stopping=True,
    )
    mlp.fit(X, X)

    # Central bottleneck layer extraction
    h1 = np.maximum(0, X @ mlp.coefs_[0] + mlp.intercepts_[0])
    latent = np.maximum(0, h1 @ mlp.coefs_[1] + mlp.intercepts_[1])

    sim_latent = cosine_similarity(latent)
    sim_text = cosine_similarity(X_text)
    sim_combined = 0.65 * sim_latent + 0.35 * sim_text

    id_to_idx = {a["id"]: i for i, a in enumerate(artist_list)}

    return artist_list, sim_combined, id_to_idx


@app.get("/api/network")
def artist_network(
    min_albums: int = Query(1, ge=1, le=10),
    top_k: int = Query(4, ge=1, le=10),
    threshold: float = Query(0.35, ge=0.0, le=1.0),
):
    artist_list, sim_combined, _ = get_neural_artist_network()

    filtered_indices = [i for i, a in enumerate(artist_list) if a["album_count"] >= min_albums]
    idx_set = set(filtered_indices)

    links: list[dict] = []
    seen_pairs: set[tuple[int, int]] = set()

    for i in filtered_indices:
        order = np.argsort(sim_combined[i])[::-1]
        count = 0
        for j in order:
            if i == j or j not in idx_set:
                continue
            w = float(sim_combined[i, j])
            if w < threshold:
                break
            pair = (min(i, j), max(i, j))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                links.append({
                    "source": artist_list[pair[0]]["id"],
                    "target": artist_list[pair[1]]["id"],
                    "weight": round(w, 3),
                    "shared_traits": _extract_shared_traits(artist_list[pair[0]], artist_list[pair[1]]),
                })
            count += 1
            if count >= top_k:
                break

    nodes = []
    for i in filtered_indices:
        a = artist_list[i]
        nodes.append({
            "id": a["id"],
            "name": a["name"],
            "country_code": a["country_code"],
            "country_name": a["country_name"],
            "album_count": a["album_count"],
            "avg_rating": a["avg_rating"],
            "rating_color": a["rating_color"],
            "rating_text_color": a["rating_text_color"],
            "scrobbles": a["scrobbles"],
            "genres": a["genres"],
            "tags": a["tags"],
            "cover": a["cover"],
            "albums": a["albums"],
        })

    n = len(nodes)
    possible_edges = (n * (n - 1)) / 2 if n > 1 else 1
    density = round(len(links) / max(possible_edges, 1), 4)

    return {
        "nodes": nodes,
        "links": links,
        "stats": {
            "total_artists": n,
            "total_connections": len(links),
            "density": density,
        },
    }

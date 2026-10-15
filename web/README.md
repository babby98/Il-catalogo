# Il Catalogo — Web

Next.js 14 · Tailwind · Framer Motion (LazyMotion) · Recharts · react-simple-maps

## Run

```powershell
# 1. API (repo root)
pip install -r requirements.txt
uvicorn api:app --port 8000

# 2. Web
cd web
npm install --legacy-peer-deps
npm run dev            # http://localhost:3000
```

`API_URL` (see `.env.example`) points the Next server at the Python API. The browser
always calls same-origin `/api/*`, which Next rewrites to the backend.

.\venv\Scripts\python.exe -m uvicorn api:app --reload --port 8000

## Pages

| Route          | What                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| `/`            | Stats hero · Top 5 of the year (bento) · nationality choropleth · Top 20 · placeholders |
| `/album/[id]`  | Cover, giant artist type, rating box, tracklist with per-track scrobbles     |
| `/history`     | Decade / year filters (URL driven) · sortable table · histogram · scatter    |

## Colour contract

All rating colours come from the API (`rating_color` / `rating_text_color`,
computed by `ColorScheme.color_vote_list`). Histogram buckets use `/api/palette`,
which comes from the same function. No rating colour is hard-coded in the frontend.

## Performance notes

- Server components by default; client JS only where there's interaction.
- Map (+ topojson) and Recharts are split out with `next/dynamic` **and** gated by
  an IntersectionObserver, so they download only when they're about to scroll into view.
- Top 20 table fetches on viewport proximity; archive table renders in 60-row windows.
- Map hover tooltip is moved via direct DOM transform, so there's no React re-render per mousemove.
- Covers go through `next/image` (AVIF/WebP, responsive `sizes`).

